import type { NextRequest } from "next/server";
import {
  openAnthropicStream,
  parseSSE,
  type AnthropicMessage,
  type SystemBlock,
} from "@/lib/anthropic";
import { MNRV_KB } from "@/content/mnrv-kb";
import { submitLeadTool, type LeadPayload } from "@/lib/intake-tools";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type ChatRequest = {
  sessionId: string;
  locale: "nl" | "en";
  pageContext?: string;
  messages: AnthropicMessage[];
  referrer?: string;
  userAgent?: string;
};

function buildSystem(locale: string, pageContext?: string): SystemBlock[] {
  const kb: SystemBlock = {
    type: "text",
    text: MNRV_KB,
    cache_control: { type: "ephemeral" },
  };
  const runtimeBlock: SystemBlock = {
    type: "text",
    text: [
      `LOCALE: Always reply in ${locale === "nl" ? "Dutch" : "English"}. Match the visitor's register \u2014 business casual, zero hype.`,
      pageContext ? `PAGE CONTEXT: ${pageContext}` : "",
      "TONE: Keep answers under ~80 words unless the user explicitly asks for detail.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
  return [kb, runtimeBlock];
}

async function persistConversation(
  body: ChatRequest,
  lastUser: AnthropicMessage | undefined
) {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("conversations")
      .upsert(
        {
          session_id: body.sessionId,
          locale: body.locale,
          user_agent: body.userAgent ?? null,
          referrer: body.referrer ?? null,
        },
        { onConflict: "session_id", ignoreDuplicates: false }
      );
    if (lastUser) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("session_id", body.sessionId)
        .single();
      if (conv?.id) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          role: "user",
          content: lastUser.content as unknown as Record<string, unknown>,
        });
      }
    }
  } catch {
    // best-effort; never block the stream
  }
}

async function persistAssistant(sessionId: string, text: string) {
  if (!text.trim()) return;
  try {
    const supabase = createServiceClient();
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("session_id", sessionId)
      .single();
    if (conv?.id) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: { type: "text", text },
      });
    }
  } catch {
    // best-effort
  }
}

async function persistLead(
  sessionId: string,
  locale: string,
  payload: LeadPayload,
  sourceUrl?: string
) {
  try {
    const supabase = createServiceClient();
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("session_id", sessionId)
      .single();

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        conversation_id: conv?.id ?? null,
        locale,
        name: payload.name,
        email: payload.email,
        company: payload.company ?? null,
        phone: payload.phone ?? null,
        scope: payload.scope,
        budget_range: payload.budget_range ?? null,
        timeline: payload.timeline ?? null,
        stack: payload.stack ?? null,
        raw_notes: payload.raw_notes ?? null,
        source_url: sourceUrl ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.functions
      .invoke("lead-notify", { body: { lead_id: lead?.id } })
      .catch(() => undefined);

    return lead?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.sessionId || !Array.isArray(body.messages)) {
    return new Response("Missing sessionId or messages", { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "nl";
  const system = buildSystem(locale, body.pageContext);
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");

  // fire-and-forget persistence
  void persistConversation(body, lastUser);

  const upstream = await openAnthropicStream({
    messages: body.messages,
    system,
    tools: [submitLeadTool],
    maxTokens: 512,
    temperature: 0.7,
  }).catch((err: Error) => err);

  if (upstream instanceof Error) {
    return new Response(`upstream: ${upstream.message}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      let toolName: string | null = null;
      let toolJson = "";

      try {
        for await (const ev of parseSSE(upstream)) {
          // forward Anthropic event as-is so the client state machine can react
          controller.enqueue(
            encoder.encode(`event: ${ev.event}\ndata: ${ev.data}\n\n`)
          );

          if (ev.event === "content_block_start") {
            const data = safeJson(ev.data);
            const block = data?.content_block;
            if (block?.type === "tool_use") {
              toolName = block.name as string;
              toolJson = "";
            }
          } else if (ev.event === "content_block_delta") {
            const data = safeJson(ev.data);
            const delta = data?.delta;
            if (delta?.type === "text_delta" && typeof delta.text === "string") {
              assistantText += delta.text;
            } else if (
              delta?.type === "input_json_delta" &&
              typeof delta.partial_json === "string"
            ) {
              toolJson += delta.partial_json;
            }
          } else if (ev.event === "content_block_stop") {
            if (toolName === "submit_lead" && toolJson) {
              const parsed = safeJson(toolJson) as LeadPayload | undefined;
              if (parsed && parsed.name && parsed.email && parsed.scope) {
                const id = await persistLead(
                  body.sessionId,
                  locale,
                  parsed,
                  body.referrer
                );
                controller.enqueue(
                  encoder.encode(
                    `event: lead_submitted\ndata: ${JSON.stringify({ id, ok: Boolean(id) })}\n\n`
                  )
                );
              }
              toolName = null;
              toolJson = "";
            }
          } else if (ev.event === "message_stop") {
            // persist the full assistant turn, don't block
            void persistAssistant(body.sessionId, assistantText);
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

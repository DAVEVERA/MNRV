// @ts-nocheck
// Deno Deploy runtime. Triggered by:
//  (a) the Next.js Edge chat route via supabase.functions.invoke({ body: { lead_id } })
//  (b) a Supabase DB webhook on public.leads INSERT (Studio-configured)
// Sends a transactional email via Resend and marks the lead as notified.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const leadId: string | undefined =
      payload?.lead_id ?? payload?.record?.id;
    if (!leadId) {
      return new Response(JSON.stringify({ error: "missing lead_id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const to = Deno.env.get("LEAD_NOTIFY_EMAIL") ?? "info@mnrv.nl";
    const from =
      Deno.env.get("LEAD_NOTIFY_FROM") ?? "Clippy <clippy@mnrv.nl>";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "lead not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    let transcript = "";
    if (lead.conversation_id) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", lead.conversation_id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (msgs) {
        transcript = msgs
          .map((m: any) => {
            const text =
              typeof m.content === "string"
                ? m.content
                : m.content?.text ??
                  (Array.isArray(m.content)
                    ? m.content
                        .map((b: any) => b?.text ?? "")
                        .filter(Boolean)
                        .join(" ")
                    : JSON.stringify(m.content));
            return `[${m.role}] ${text}`;
          })
          .join("\n");
      }
    }

    const subject = `\u26a1 Nieuwe lead via Clippy \u2014 ${lead.name ?? "onbekend"}`;
    const html = `
<div style="font-family:ui-sans-serif,system-ui;background:#0a0a0d;color:#f5f5f5;padding:24px">
  <h2 style="margin:0 0 12px">Nieuwe lead binnen via Clippy</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%;max-width:640px">
    <tbody>
      ${row("Naam", lead.name)}
      ${row("Email", lead.email)}
      ${row("Bedrijf", lead.company)}
      ${row("Telefoon", lead.phone)}
      ${row("Scope", lead.scope)}
      ${row("Budget", lead.budget_range)}
      ${row("Timeline", lead.timeline)}
      ${row("Stack", Array.isArray(lead.stack) ? lead.stack.join(", ") : lead.stack)}
      ${row("Notities", lead.raw_notes)}
      ${row("Taal", lead.locale)}
      ${row("Referrer", lead.source_url)}
    </tbody>
  </table>
  ${
    transcript
      ? `<h3 style="margin-top:20px">Transcript</h3><pre style="white-space:pre-wrap;background:#111;padding:12px;border-radius:8px">${escapeHtml(
          transcript
        )}</pre>`
      : ""
  }
</div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email ?? undefined,
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return new Response(
        JSON.stringify({ error: "resend failed", detail: errText }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        }
      );
    }

    await supabase
      .from("leads")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", leadId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});

function row(label: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr>
    <td style="padding:6px 10px;opacity:0.55;width:140px">${label}</td>
    <td style="padding:6px 10px">${escapeHtml(String(value))}</td>
  </tr>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

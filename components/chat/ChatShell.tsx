"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChatInput, type ChatInputHandle } from "./ChatInput";
import { SpeechBubble } from "./SpeechBubble";
import { useClippy } from "@/components/providers/ClippyStateProvider";
import { shouldExcite } from "@/lib/clippy-fsm";
import { getOrCreateSessionId } from "@/lib/session";
import type { AnthropicMessage } from "@/lib/anthropic";

type Turn = { role: "user" | "assistant"; text: string };

export function ChatShell({ greet }: { greet: string }) {
  const locale = useLocale() as "nl" | "en";
  const t = useTranslations("chat");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const setState = useClippy((s) => s.setState);
  const transient = useClippy((s) => s.transient);
  const inputRef = useRef<ChatInputHandle>(null);
  const greeted = useRef(false);

  // Initial wave + local greeting on first paint
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    transient("waving");
    let i = 0;
    const id = window.setInterval(() => {
      i += 3;
      setStreaming(greet.slice(0, i));
      if (i >= greet.length) {
        window.clearInterval(id);
        setTurns([{ role: "assistant", text: greet }]);
        setStreaming("");
        setState("idle");
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [greet, setState, transient]);

  const send = async (text: string) => {
    setNotice(null);
    setBusy(true);
    setState("thinking");

    const next: Turn[] = [...turns, { role: "user", text }];
    setTurns(next);

    const payload = {
      sessionId: getOrCreateSessionId(),
      locale,
      referrer:
        typeof document !== "undefined" ? document.referrer || undefined : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      messages: next.map<AnthropicMessage>((turn) => ({
        role: turn.role,
        content: [{ type: "text" as const, text: turn.text }],
      })),
    };

    let assembled = "";
    let firstToken = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) {
        throw new Error(`chat ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = chunk.split("\n");
          let event = "message";
          const dataParts: string[] = [];
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:"))
              dataParts.push(line.slice(5).trim());
          }
          const data = dataParts.join("\n");

          if (event === "content_block_delta") {
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.delta;
              if (delta?.type === "text_delta" && typeof delta.text === "string") {
                if (firstToken) {
                  firstToken = false;
                  setState("talking");
                }
                assembled += delta.text;
                setStreaming(assembled);
                if (shouldExcite(delta.text)) transient("excited");
              }
            } catch {
              /* ignore */
            }
          } else if (event === "lead_submitted") {
            transient("celebrating");
            setNotice(t("leadSent"));
          } else if (event === "message_stop") {
            setTurns((prev) => [...prev, { role: "assistant", text: assembled }]);
            setStreaming("");
            setState("idle");
          } else if (event === "error") {
            setNotice(t("errorFallback"));
            setState("idle");
          }
        }
      }
    } catch {
      setNotice(t("errorFallback"));
      setState("idle");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const lastAssistant = [...turns].reverse().find((x) => x.role === "assistant");
  const bubbleText = streaming || lastAssistant?.text || "";
  const bubbleVisible = Boolean(bubbleText);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-end gap-3 px-4 pb-6 pt-20 sm:pb-10"
      aria-label={t("historyToggle")}
    >
      <div className="flex w-full flex-1 items-start justify-center">
        <SpeechBubble
          text={bubbleText}
          visible={bubbleVisible}
          label={busy && !streaming ? t("thinking") : undefined}
        />
      </div>
      {notice ? (
        <div className="pointer-events-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-white/70 backdrop-blur">
          {notice}
        </div>
      ) : null}
      <ChatInput
        ref={inputRef}
        onSend={send}
        placeholder={t("placeholder")}
        disabled={busy}
      />
    </div>
  );
}

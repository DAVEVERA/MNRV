"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type Props = {
  onSend: (text: string) => void;
  placeholder: string;
  disabled?: boolean;
};

export type ChatInputHandle = { focus: () => void };

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { onSend, placeholder, disabled },
  ref
) {
  const [value, setValue] = useState("");
  const [composing, setComposing] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
  }));

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (area.current) area.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !composing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="pointer-events-auto mx-auto flex w-full max-w-xl items-end gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-md"
    >
      <textarea
        ref={area}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          const t = e.target as HTMLTextAreaElement;
          t.style.height = "auto";
          t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="min-h-[36px] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-[1.45] text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-30"
      >
        &rarr;
      </button>
    </form>
  );
});

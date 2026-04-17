"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  text: string;
  visible: boolean;
  label?: string;
};

export function SpeechBubble({ text, visible, label }: Props) {
  return (
    <AnimatePresence mode="wait">
      {visible && text ? (
        <motion.div
          key={text.length}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white/90 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md"
        >
          {label ? (
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              {label}
            </div>
          ) : null}
          <p className="whitespace-pre-wrap text-[15px] leading-[1.55]">{text}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

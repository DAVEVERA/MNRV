"use client";

import { create } from "zustand";
import type { ClippyState } from "@/lib/clippy-fsm";
import { CLIPPY_CLIPS } from "@/lib/clippy-fsm";

type Store = {
  state: ClippyState;
  cursor: { x: number; y: number };
  setState: (next: ClippyState) => void;
  transient: (next: ClippyState) => void;
  setCursor: (x: number, y: number) => void;
};

export const useClippy = create<Store>((set, get) => ({
  state: "idle",
  cursor: { x: 0.5, y: 0.5 },

  setState: (next) => set({ state: next }),

  transient: (next) => {
    const prev = get().state;
    const meta = CLIPPY_CLIPS[next];
    set({ state: next });
    const hold = meta.minDurationMs ?? 1200;
    window.setTimeout(() => {
      if (get().state === next) set({ state: prev === next ? "idle" : prev });
    }, hold);
  },

  setCursor: (x, y) => set({ cursor: { x, y } }),
}));

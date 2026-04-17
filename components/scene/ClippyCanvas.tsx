"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { useEffect } from "react";
import { SceneLights } from "./SceneLights";
import { ClippyModel } from "./ClippyModel";
import { useClippy } from "@/components/providers/ClippyStateProvider";

function CursorBridge() {
  const setCursor = useClippy((s) => s.setCursor);
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      setCursor(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, [setCursor]);
  return null;
}

export function ClippyCanvas() {
  return (
    <>
      <CursorBridge />
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        shadows
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      >
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 6, 14]} />
        <PerspectiveCamera makeDefault position={[0, 0.1, 4.2]} fov={32} />
        <SceneLights />
        <Environment preset="night" />
        <ClippyModel />
      </Canvas>
    </>
  );
}

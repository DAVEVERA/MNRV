"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function SceneLights() {
  const key = useRef<THREE.DirectionalLight>(null);
  useFrame(({ clock }) => {
    if (!key.current) return;
    // subtle flicker to make the rim light feel alive
    const t = clock.getElapsedTime();
    key.current.intensity = 2.1 + Math.sin(t * 0.7) * 0.08;
  });

  return (
    <>
      <ambientLight intensity={0.08} color="#0b0d12" />
      <directionalLight
        ref={key}
        position={[3, 4, 2.5]}
        intensity={2.1}
        color="#f4e5c0"
      />
      <directionalLight
        position={[-4, 2, -2]}
        intensity={0.9}
        color="#5a7cff"
      />
      <pointLight position={[0, -2, 3]} intensity={0.4} color="#fff" />
    </>
  );
}

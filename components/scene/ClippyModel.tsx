"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useClippy } from "@/components/providers/ClippyStateProvider";

// Paperclip silhouette built from an extruded rounded-rect path.
// This lets us ship a real Clippy without shipping a 3D asset; a Sketchfab GLB
// can be dropped in later and swapped for this mesh.
function usePaperclipGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    // outer rounded rect
    const w = 0.55;
    const h = 1.6;
    const r = w / 2;

    shape.moveTo(-w, h / 2 - r);
    shape.absarc(0, h / 2 - r, r, Math.PI, 0, true);
    shape.lineTo(w, -h / 2 + r);
    shape.absarc(0, -h / 2 + r, r, 0, Math.PI, true);
    shape.lineTo(-w, h / 2 - r);

    // inner rounded rect (hole)
    const hole = new THREE.Path();
    const iw = w - 0.18;
    const ih = h - 0.36;
    const ir = iw / 2;
    hole.moveTo(-iw, ih / 2 - ir);
    hole.absarc(0, ih / 2 - ir, ir, Math.PI, 0, true);
    hole.lineTo(iw, -ih / 2 + ir);
    hole.absarc(0, -ih / 2 + ir, ir, 0, Math.PI, true);
    hole.lineTo(-iw, ih / 2 - ir);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.045,
      bevelSegments: 6,
      curveSegments: 48,
    });
    geo.center();
    return geo;
  }, []);
}

function Eye({
  position,
  look,
}: {
  position: [number, number, number];
  look: { x: number; y: number };
}) {
  const pupil = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!pupil.current) return;
    const targetX = (look.x - 0.5) * 0.09;
    const targetY = -(look.y - 0.5) * 0.07;
    pupil.current.position.x = THREE.MathUtils.lerp(
      pupil.current.position.x,
      targetX,
      0.12
    );
    pupil.current.position.y = THREE.MathUtils.lerp(
      pupil.current.position.y,
      targetY,
      0.12
    );
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshPhysicalMaterial
          color="#f7f2ea"
          roughness={0.28}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh ref={pupil} position={[0, 0, 0.21]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.35} />
      </mesh>
    </group>
  );
}

export function ClippyModel() {
  const group = useRef<THREE.Group>(null);
  const paperclip = usePaperclipGeometry();
  const state = useClippy((s) => s.state);
  const cursor = useClippy((s) => s.cursor);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();

    // Ambient idle sway is always active
    const baseY = Math.sin(t * 0.6) * 0.06;
    const baseX = Math.cos(t * 0.45) * 0.03;

    let targetRotY = baseY;
    let targetRotX = baseX;
    let targetPosY = Math.sin(t * 1.2) * 0.04;

    if (state === "thinking") {
      targetRotX += Math.sin(t * 2.6) * 0.08;
      targetRotY += Math.sin(t * 1.8) * 0.04;
    } else if (state === "talking") {
      targetPosY += Math.sin(t * 9) * 0.04;
      targetRotX += Math.sin(t * 8) * 0.04;
    } else if (state === "waving") {
      targetRotY += Math.sin(t * 6) * 0.35;
    } else if (state === "excited") {
      targetPosY += Math.abs(Math.sin(t * 6)) * 0.12;
      targetRotX += Math.sin(t * 5) * 0.05;
    } else if (state === "celebrating") {
      targetRotY += t * 2;
      targetPosY += Math.abs(Math.sin(t * 4)) * 0.2;
    } else {
      // idle: follow cursor gently
      targetRotY += (cursor.x - 0.5) * 0.25;
      targetRotX += (cursor.y - 0.5) * 0.15;
    }

    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      targetRotY,
      delta * 4
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      targetRotX,
      delta * 4
    );
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      targetPosY,
      delta * 4
    );
  });

  return (
    <group ref={group} dispose={null}>
      {/* paperclip body */}
      <mesh geometry={paperclip} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#d8dbe0"
          metalness={1}
          roughness={0.22}
          clearcoat={0.4}
          clearcoatRoughness={0.18}
          envMapIntensity={1.1}
        />
      </mesh>

      <Eye position={[-0.3, 0.35, 0.22]} look={cursor} />
      <Eye position={[0.3, 0.35, 0.22]} look={cursor} />

      {/* subtle mustache nod to ref image */}
      <mesh position={[0, -0.08, 0.22]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.28, 0.06, 16, 48, Math.PI]} />
        <meshStandardMaterial color="#18110b" roughness={0.65} />
      </mesh>
    </group>
  );
}

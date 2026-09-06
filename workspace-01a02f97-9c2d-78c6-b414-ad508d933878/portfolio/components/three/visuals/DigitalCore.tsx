"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NodeRing } from "@/components/three/primitives/NodeRing";

interface DigitalCoreProps {
  staticMode?: boolean;
  detail?: "high" | "low";
}

/**
 * Central engineering core: a layered wireframe reactor with orbital
 * service nodes — represents Vaibhav's technical ecosystem.
 */
export function DigitalCore({ staticMode = false, detail = "high" }: DigitalCoreProps) {
  const inner = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (staticMode) return;
    const t = clock.getElapsedTime();
    if (inner.current) {
      inner.current.rotation.y = t * 0.22;
      inner.current.rotation.x = Math.sin(t * 0.18) * 0.16;
      const pulse = 1 + Math.sin(t * 1.4) * 0.022;
      inner.current.scale.setScalar(pulse);
    }
    if (shell.current) {
      shell.current.rotation.y = -t * 0.1;
      shell.current.rotation.z = t * 0.05;
    }
  });

  return (
    <group aria-hidden>
      {/* inner reactor */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.02, detail === "high" ? 1 : 0]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.65} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.62, detail === "high" ? 2 : 1]} />
        <meshBasicMaterial color="#0e7490" transparent opacity={0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshBasicMaterial color="#a5f3fc" transparent opacity={0.9} />
      </mesh>

      {/* outer containment shell */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.62, 1]} />
        <meshBasicMaterial color="#334155" wireframe transparent opacity={0.28} />
      </mesh>

      {/* orbital service layers */}
      <NodeRing radius={2.15} count={7} speed={0.16} tilt={[Math.PI / 2.4, 0, 0.4]} staticMode={staticMode} />
      <NodeRing
        radius={2.6}
        count={5}
        nodeSize={0.04}
        color="#a78bfa"
        speed={-0.1}
        tilt={[Math.PI / 1.9, 0, -0.5]}
        staticMode={staticMode}
      />
    </group>
  );
}

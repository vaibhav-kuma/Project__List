"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DataStream } from "@/components/three/primitives/DataStream";

interface AITransformEngineProps {
  active?: boolean;
  staticMode?: boolean;
}

/**
 * LegacyLift AI: legacy code blocks enter from the left, pass through an
 * AI-agent transformation gate, and exit as ordered modern modules.
 */
export function AITransformEngine({ active = false, staticMode = false }: AITransformEngineProps) {
  const gate = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (staticMode || !gate.current) return;
    gate.current.rotation.z += delta * (active ? 0.9 : 0.4);
  });

  const legacyBlocks: { pos: [number, number, number]; rot: [number, number, number]; s: number }[] = [
    { pos: [-1.5, 0.28, 0.1], rot: [0.4, 0.7, 0.2], s: 0.26 },
    { pos: [-1.32, -0.3, -0.15], rot: [0.9, 0.2, 0.5], s: 0.22 },
    { pos: [-1.75, -0.05, 0.25], rot: [0.2, 1.1, 0.8], s: 0.2 },
    { pos: [-1.28, 0.05, 0.32], rot: [1.2, 0.4, 0.1], s: 0.18 },
    { pos: [-1.62, 0.42, -0.22], rot: [0.6, 0.3, 1.3], s: 0.16 },
  ];

  const modernBlocks: [number, number, number][] = [];
  for (let x = 0; x < 2; x++)
    for (let y = 0; y < 2; y++)
      for (let z = 0; z < 2; z++)
        modernBlocks.push([1.35 + x * 0.24, -0.14 + y * 0.24, -0.12 + z * 0.24]);

  return (
    <group aria-hidden>
      {/* legacy input — irregular, tilted blocks */}
      {legacyBlocks.map((b, i) => (
        <mesh key={`l${i}`} position={b.pos} rotation={b.rot}>
          <boxGeometry args={[b.s, b.s, b.s]} />
          <meshBasicMaterial color="#8b9bb4" wireframe transparent opacity={0.75} />
        </mesh>
      ))}

      {/* AI transformation gate */}
      <group position={[0, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.52, 0.012, 10, 72]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={active ? 0.95 : 0.65} />
        </mesh>
        <group ref={gate}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.36, 0.008, 8, 56]} />
            <meshBasicMaterial color="#c4b5fd" transparent opacity={0.8} />
          </mesh>
        </group>
        <mesh>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#ddd6fe" />
        </mesh>
      </group>

      {/* modernized output — ordered lattice */}
      {modernBlocks.map((p, i) => (
        <mesh key={`m${i}`} position={p}>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.85} />
        </mesh>
      ))}

      {/* transformation streams */}
      <DataStream from={[-1.45, 0.1, 0.1]} to={[0, 0, 0]} lift={0.25} color="#94a3b8" speed={active ? 0.55 : 0.3} staticMode={staticMode} />
      <DataStream from={[0, 0, 0]} to={[1.55, 0.1, 0.1]} lift={0.25} color="#67e8f9" speed={active ? 0.55 : 0.3} staticMode={staticMode} />
    </group>
  );
}

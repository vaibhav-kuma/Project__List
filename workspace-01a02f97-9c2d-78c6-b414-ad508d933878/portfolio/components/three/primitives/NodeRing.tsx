"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NodeRingProps {
  radius: number;
  count: number;
  nodeSize?: number;
  color?: string;
  speed?: number;
  tilt?: [number, number, number];
  staticMode?: boolean;
}

/** A ring of small orbiting nodes — represents services/satellites around a core. */
export function NodeRing({
  radius,
  count,
  nodeSize = 0.05,
  color = "#67e8f9",
  speed = 0.25,
  tilt = [0, 0, 0],
  staticMode = false,
}: NodeRingProps) {
  const group = useRef<THREE.Group>(null);

  const angles = useMemo(
    () => Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2),
    [count],
  );

  useFrame((_, delta) => {
    if (staticMode || !group.current) return;
    group.current.rotation.z += delta * speed;
  });

  return (
    <group rotation={tilt}>
      {/* orbit path */}
      <mesh rotation={[Math.PI / 2, 0, 0]} aria-hidden>
        <torusGeometry args={[radius, 0.0035, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
      <group ref={group}>
        {angles.map((a, i) => (
          <mesh
            key={i}
            position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}
            aria-hidden
          >
            <sphereGeometry args={[nodeSize, 10, 10]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

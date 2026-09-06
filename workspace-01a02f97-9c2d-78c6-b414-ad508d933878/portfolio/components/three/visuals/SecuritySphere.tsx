"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface SecuritySphereProps {
  active?: boolean;
  staticMode?: boolean;
}

/**
 * SOC Platform: a command core with 15 service nodes distributed on a
 * sphere (Fibonacci lattice) and telemetry lines into the center.
 */
export function SecuritySphere({ active = false, staticMode = false }: SecuritySphereProps) {
  const group = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const pts: [number, number, number][] = [];
    const n = 15;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push([Math.cos(theta) * r * 1.05, y * 1.05, Math.sin(theta) * r * 1.05]);
    }
    return pts;
  }, []);

  useFrame((_, delta) => {
    if (staticMode || !group.current) return;
    group.current.rotation.y += delta * (active ? 0.34 : 0.12);
  });

  const lineOpacity = active ? 0.5 : 0.22;

  return (
    <group ref={group} aria-hidden>
      {/* command core */}
      <mesh>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.16, 14, 14]} />
        <meshBasicMaterial color="#a5f3fc" />
      </mesh>

      {/* containment shell */}
      <mesh>
        <icosahedronGeometry args={[1.32, 1]} />
        <meshBasicMaterial color="#164e63" wireframe transparent opacity={active ? 0.4 : 0.2} />
      </mesh>

      {/* service nodes + telemetry lines */}
      {nodes.map((p, i) => (
        <group key={i}>
          <mesh position={p}>
            <sphereGeometry args={[i % 3 === 0 ? 0.055 : 0.042, 10, 10]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#67e8f9" : "#38bdf8"} />
          </mesh>
          <Line points={[[0, 0, 0], p]} color="#22d3ee" transparent opacity={lineOpacity} lineWidth={0.6} />
        </group>
      ))}

      {/* equatorial ops ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.004, 8, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={active ? 0.6 : 0.3} />
      </mesh>
    </group>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count?: number;
  radius?: number;
  size?: number;
  color?: string;
  speed?: number;
  /** when true, no per-frame animation runs */
  staticMode?: boolean;
}

/** Instanced point cloud used as ambient lab atmosphere. */
export function ParticleField({
  count = 260,
  radius = 9,
  size = 0.02,
  color = "#38bdf8",
  speed = 0.02,
  staticMode = false,
}: ParticleFieldProps) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.35 + Math.random() * 0.65);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      arr[i * 3 + 2] = r * Math.cos(phi) * 0.7;
    }
    return arr;
  }, [count, radius]);

  useFrame((_, delta) => {
    if (staticMode || !points.current) return;
    points.current.rotation.y += delta * speed;
  });

  return (
    <points ref={points} aria-hidden>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

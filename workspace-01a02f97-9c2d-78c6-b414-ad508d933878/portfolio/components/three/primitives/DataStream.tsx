"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DataStreamProps {
  from: [number, number, number];
  to: [number, number, number];
  /** midpoint lift for a gentle arc */
  lift?: number;
  particles?: number;
  color?: string;
  speed?: number;
  size?: number;
  staticMode?: boolean;
}

/** Small packet stream flowing along an arc between two points. */
export function DataStream({
  from,
  to,
  lift = 0.4,
  particles = 7,
  color = "#22d3ee",
  speed = 0.35,
  size = 0.035,
  staticMode = false,
}: DataStreamProps) {
  const ref = useRef<THREE.Points>(null);
  const phases = useMemo(
    () => Array.from({ length: particles }, (_, i) => i / particles),
    [particles],
  );

  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += lift;
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [from, to, lift]);

  const positions = useMemo(() => new Float32Array(particles * 3), [particles]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (staticMode) {
      // Park packets evenly along the curve when motion is reduced.
      phases.forEach((p, i) => {
        const pt = curve.getPoint(p);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      });
      ref.current.geometry.attributes.position.needsUpdate = true;
      return;
    }
    const t = clock.getElapsedTime() * speed;
    phases.forEach((phase, i) => {
      const p = (t + phase) % 1;
      const pt = curve.getPoint(p);
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
    });
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} aria-hidden>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

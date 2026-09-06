"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface MonitoringGridProps {
  active?: boolean;
  staticMode?: boolean;
}

/**
 * Threat-Detection-Monitoring-Dashboard: an observability mesh of
 * telemetry components with staggered activity pulses.
 */
export function MonitoringGrid({ active = false, staticMode = false }: MonitoringGridProps) {
  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);

  const cols = 4;
  const rows = 3;
  const gap = 0.46;

  const cells = useMemo(() => {
    const arr: { pos: [number, number, number]; phase: number }[] = [];
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        arr.push({
          pos: [(x - (cols - 1) / 2) * gap, 0, (z - (rows - 1) / 2) * gap],
          phase: (x * rows + z) * 0.55,
        });
      }
    }
    return arr;
  }, []);

  const links = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        const p: [number, number, number] = [
          (x - (cols - 1) / 2) * gap,
          0,
          (z - (rows - 1) / 2) * gap,
        ];
        if (x < cols - 1) lines.push([p, [p[0] + gap, 0, p[2]]]);
        if (z < rows - 1) lines.push([p, [p[0], 0, p[2] + gap]]);
      }
    }
    return lines;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    cellRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const cell = cells[i];
      const wave = staticMode ? 0.6 : 0.5 + 0.5 * Math.sin(t * (active ? 2.4 : 1.3) + cell.phase);
      mesh.scale.y = 0.35 + wave * 1.35;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + wave * 0.55;
    });
  });

  return (
    <group rotation={[0.42, 0, 0]} aria-hidden>
      {/* mesh links */}
      {links.map((pts, i) => (
        <Line key={i} points={pts} color="#334155" transparent opacity={0.55} lineWidth={0.6} />
      ))}

      {/* telemetry cells */}
      {cells.map((cell, i) => (
        <mesh
          key={i}
          ref={(el) => {
            cellRefs.current[i] = el;
          }}
          position={[cell.pos[0], 0.08, cell.pos[2]]}
        >
          <boxGeometry args={[0.18, 0.3, 0.18]} />
          <meshBasicMaterial
            color={i % 5 === 0 ? "#f472b6" : i % 3 === 0 ? "#22d3ee" : "#38bdf8"}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* alert sentinel */}
      <mesh position={[0, 1.05, 0]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshBasicMaterial color="#f472b6" />
      </mesh>
      <Line points={[[0, 0.96, 0], [0, 0.3, 0]]} color="#f472b6" transparent opacity={0.5} lineWidth={0.7} />
    </group>
  );
}

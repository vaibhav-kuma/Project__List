"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ThreatRadarProps {
  active?: boolean;
  staticMode?: boolean;
}

interface Blip {
  pos: [number, number, number];
  phase: number;
  threat: boolean;
}

/**
 * VADT: a continuously scanning detection radar. Blips surface as the
 * sweep passes; interaction raises the scan rate and reveals threats.
 */
export function ThreatRadar({ active = false, staticMode = false }: ThreatRadarProps) {
  const sweep = useRef<THREE.Group>(null);
  const blipRefs = useRef<(THREE.Mesh | null)[]>([]);

  const blips: Blip[] = useMemo(
    () => [
      { pos: [0.62, 0.04, 0.35], phase: 0.0, threat: false },
      { pos: [-0.45, 0.04, 0.82], phase: 0.25, threat: true },
      { pos: [-0.95, 0.04, -0.32], phase: 0.5, threat: false },
      { pos: [0.3, 0.04, -0.9], phase: 0.7, threat: true },
      { pos: [1.05, 0.04, -0.4], phase: 0.85, threat: false },
      { pos: [-0.2, 0.04, -0.45], phase: 0.4, threat: true },
    ],
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!staticMode && sweep.current) {
      sweep.current.rotation.y -= delta * (active ? 1.5 : 0.65);
    }
    const t = clock.getElapsedTime();
    blipRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const b = blips[i];
      const wave = 0.5 + 0.5 * Math.sin(t * (staticMode ? 0 : 2.1) + b.phase * Math.PI * 2);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const visible = active ? true : !b.threat || wave > 0.72;
      mat.opacity = visible ? 0.35 + wave * 0.6 : 0.06;
      const s = 0.8 + wave * 0.5;
      mesh.scale.setScalar(staticMode ? 1 : s);
    });
  });

  return (
    <group aria-hidden>
      {/* radar grid */}
      <polarGridHelper
        args={[1.35, 12, 4, 64, new THREE.Color("#155e75"), new THREE.Color("#0e3a4a")]}
      />

      {/* rotating sweep */}
      <group ref={sweep}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <circleGeometry args={[1.35, 24, 0, 0.55]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.13}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
          <circleGeometry args={[1.35, 2, 0, 0.015]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* detection blips */}
      {blips.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            blipRefs.current[i] = el;
          }}
          position={b.pos}
        >
          <sphereGeometry args={[0.038, 10, 10]} />
          <meshBasicMaterial color={b.threat ? "#fb7185" : "#34d399"} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* emitter mast */}
      <mesh position={[0, 0.16, 0]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>

      {/* outer boundary */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.34, 1.36, 72]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

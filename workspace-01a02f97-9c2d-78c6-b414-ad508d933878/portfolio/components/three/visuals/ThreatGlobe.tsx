"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface ThreatGlobeProps {
  active?: boolean;
  staticMode?: boolean;
}

/**
 * DarkExposure: a threat-intelligence globe — exposure nodes linked by
 * intelligence arcs across the dark-web surface.
 */
export function ThreatGlobe({ active = false, staticMode = false }: ThreatGlobeProps) {
  const group = useRef<THREE.Group>(null);

  const { nodes, arcs } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 18;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(1.02));
    }
    const pairs: [number, number][] = [
      [0, 7],
      [2, 11],
      [4, 15],
      [1, 9],
      [6, 13],
      [3, 16],
      [8, 17],
    ];
    const arcPts = pairs.map(([a, b]) => {
      const start = pts[a];
      const end = pts[b];
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1.55);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      return curve.getPoints(28).map((p) => [p.x, p.y, p.z] as [number, number, number]);
    });
    return { nodes: pts.map((p) => [p.x, p.y, p.z] as [number, number, number]), arcs: arcPts };
  }, []);

  useFrame((_, delta) => {
    if (staticMode || !group.current) return;
    group.current.rotation.y += delta * (active ? 0.42 : 0.16);
  });

  return (
    <group ref={group} aria-hidden>
      {/* globe shell */}
      <mesh>
        <icosahedronGeometry args={[1.02, 2]} />
        <meshBasicMaterial color="#312e81" wireframe transparent opacity={active ? 0.5 : 0.3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.98, 20, 20]} />
        <meshBasicMaterial color="#0b1020" transparent opacity={0.5} />
      </mesh>

      {/* intelligence nodes */}
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[i % 4 === 0 ? 0.045 : 0.03, 10, 10]} />
          <meshBasicMaterial color={i % 4 === 0 ? "#f472b6" : "#818cf8"} />
        </mesh>
      ))}

      {/* intelligence arcs */}
      {arcs.map((arc, i) => (
        <Line
          key={i}
          points={arc}
          color={i % 2 === 0 ? "#818cf8" : "#f472b6"}
          transparent
          opacity={active ? 0.75 : 0.4}
          lineWidth={0.9}
        />
      ))}
    </group>
  );
}

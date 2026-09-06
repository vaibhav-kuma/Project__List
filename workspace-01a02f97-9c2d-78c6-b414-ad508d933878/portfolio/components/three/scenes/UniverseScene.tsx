"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { VisualizationKind } from "@/lib/types";
import { SecuritySphere } from "@/components/three/visuals/SecuritySphere";
import { AITransformEngine } from "@/components/three/visuals/AITransformEngine";
import { ThreatRadar } from "@/components/three/visuals/ThreatRadar";
import { ThreatGlobe } from "@/components/three/visuals/ThreatGlobe";
import { MonitoringGrid } from "@/components/three/visuals/MonitoringGrid";
import { ParticleField } from "@/components/three/primitives/ParticleField";

export interface UniverseProjectSlot {
  slug: string;
  name: string;
  visualization: VisualizationKind;
  position: [number, number, number];
  baseScale: number;
  accent: string;
}

interface UniverseSceneProps {
  slots: UniverseProjectSlot[];
  hovered: string | null;
  staticMode: boolean;
  quality: "high" | "low";
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}

const VISUALS: Record<VisualizationKind, React.ComponentType<{ active?: boolean; staticMode?: boolean }>> = {
  "security-core": SecuritySphere,
  "ai-transform": AITransformEngine,
  "threat-radar": ThreatRadar,
  "threat-globe": ThreatGlobe,
  "monitoring-grid": MonitoringGrid,
};

/** Fits all five objects horizontally regardless of aspect ratio. */
function CameraRig({ staticMode }: { staticMode: boolean }) {
  const { camera, size } = useThree();

  useFrame(({ pointer }) => {
    const halfExtent = 7.8;
    const aspect = size.width / Math.max(size.height, 1);
    const dist = THREE.MathUtils.clamp(halfExtent / (Math.tan(THREE.MathUtils.degToRad(21)) * aspect), 11, 22);
    const targetZ = dist;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
    if (!staticMode) {
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.5, 0.03);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.0 + pointer.y * 0.35, 0.03);
    }
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function ProjectObject({
  slot,
  hovered,
  staticMode,
  onHover,
  onSelect,
}: {
  slot: UniverseProjectSlot;
  hovered: string | null;
  staticMode: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const active = hovered === slot.slug;
  useCursor(active);

  useFrame((_, delta) => {
    if (!group.current) return;
    const target = slot.baseScale * (active ? 1.14 : 1);
    const s = THREE.MathUtils.damp(group.current.scale.x, target, 6, delta);
    group.current.scale.setScalar(s);
  });

  const Visual = VISUALS[slot.visualization];

  return (
    <group
      position={slot.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(slot.slug);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(slot.slug);
      }}
    >
      <group ref={group} scale={slot.baseScale}>
        {/* dim non-hovered projects slightly to emphasize the focus */}
        <group>
          <Visual active={active} staticMode={staticMode} />
        </group>
        {/* generous invisible hit target */}
        <mesh aria-hidden>
          <sphereGeometry args={[1.7, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {/* selection halo */}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5 * slot.baseScale, 0]}>
          <ringGeometry args={[1.05, 1.12, 48]} />
          <meshBasicMaterial color={slot.accent} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Note: project names are also rendered in the DOM legend for accessibility */}
    </group>
  );
}

export function UniverseScene({ slots, hovered, staticMode, quality, onHover, onSelect }: UniverseSceneProps) {
  const links = useMemo(() => {
    const out: [number, number, number][][] = [];
    for (let i = 0; i < slots.length - 1; i++) {
      const a = slots[i].position;
      const b = slots[i + 1].position;
      const mid: [number, number, number] = [(a[0] + b[0]) / 2, -1.15, 0.1];
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...a),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...b),
      );
      out.push(curve.getPoints(24).map((p) => [p.x, p.y, p.z] as [number, number, number]));
    }
    return out;
  }, [slots]);

  return (
    <Canvas
      dpr={[1, quality === "high" ? 1.6 : 1.1]}
      camera={{ position: [0, 1.0, 13], fov: 42, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <CameraRig staticMode={staticMode} />

      {/* ecosystem connections between projects */}
      {links.map((pts, i) => (
        <Line key={i} points={pts} color="#1e293b" transparent opacity={0.8} lineWidth={0.8} />
      ))}

      {slots.map((slot) => (
        <ProjectObject
          key={slot.slug}
          slot={slot}
          hovered={hovered}
          staticMode={staticMode}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      <ParticleField
        count={quality === "high" ? 220 : 90}
        radius={13}
        size={0.022}
        color="#334155"
        speed={0.01}
        staticMode={staticMode}
      />
    </Canvas>
  );
}

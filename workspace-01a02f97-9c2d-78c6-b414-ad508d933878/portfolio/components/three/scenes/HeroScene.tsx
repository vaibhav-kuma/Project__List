"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DigitalCore } from "@/components/three/visuals/DigitalCore";
import { ParticleField } from "@/components/three/primitives/ParticleField";
import { DataStream } from "@/components/three/primitives/DataStream";

interface HeroSceneProps {
  staticMode: boolean;
  quality: "high" | "low";
}

/** Subtle pointer-parallax camera. Never moves in static mode. */
function CameraRig({ staticMode }: { staticMode: boolean }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0.9, 0, 0));

  useFrame(({ pointer }) => {
    if (staticMode) return;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.55, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.35 + pointer.y * 0.35, 0.04);
    camera.lookAt(target.current);
  });

  return null;
}

export function HeroScene({ staticMode, quality }: HeroSceneProps) {
  return (
    <Canvas
      dpr={[1, quality === "high" ? 1.75 : 1.25]}
      camera={{ position: [0, 0.35, 7.2], fov: 45, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <CameraRig staticMode={staticMode} />

      <group position={[0.9, 0, 0]}>
        <DigitalCore staticMode={staticMode} detail={quality === "high" ? "high" : "low"} />

        {/* data flowing into and out of the core */}
        <DataStream from={[-4.6, 1.2, -1]} to={[0, 0, 0]} lift={0.6} color="#38bdf8" speed={0.16} particles={5} staticMode={staticMode} />
        <DataStream from={[0, 0, 0]} to={[4.4, -1.1, -0.6]} lift={0.5} color="#a78bfa" speed={0.14} particles={5} staticMode={staticMode} />
        <DataStream from={[-3.8, -1.4, -0.8]} to={[0, 0, 0]} lift={0.4} color="#34d399" speed={0.12} particles={4} staticMode={staticMode} />
      </group>

      <ParticleField
        count={quality === "high" ? 320 : 120}
        radius={10}
        size={0.02}
        color="#38bdf8"
        speed={0.016}
        staticMode={staticMode}
      />
    </Canvas>
  );
}

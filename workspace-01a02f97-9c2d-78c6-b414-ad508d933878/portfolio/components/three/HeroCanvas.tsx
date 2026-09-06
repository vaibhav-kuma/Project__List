"use client";

import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

const HeroScene = dynamic(
  () => import("@/components/three/scenes/HeroScene").then((m) => m.HeroScene),
  { ssr: false, loading: () => null },
);

/** CSS-only fallback shown when WebGL is unavailable. */
export function HeroFallback() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="lab-grid absolute inset-0" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-pulse/[0.07] blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/3 -translate-y-1/2 rounded-full border border-pulse/20" />
      <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/3 -translate-y-1/2 rounded-full border border-violet-neon/20" />
    </div>
  );
}

export function HeroCanvas() {
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (!webgl) return <HeroFallback />;

  return (
    <HeroScene staticMode={reduced} quality={isMobile ? "low" : "high"} />
  );
}

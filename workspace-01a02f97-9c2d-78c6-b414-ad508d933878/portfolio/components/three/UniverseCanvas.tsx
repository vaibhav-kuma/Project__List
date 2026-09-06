"use client";

import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { UniverseProjectSlot } from "@/components/three/scenes/UniverseScene";

const UniverseScene = dynamic(
  () => import("@/components/three/scenes/UniverseScene").then((m) => m.UniverseScene),
  { ssr: false, loading: () => null },
);

interface UniverseCanvasProps {
  slots: UniverseProjectSlot[];
  hovered: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}

export function UniverseCanvas({ slots, hovered, onHover, onSelect }: UniverseCanvasProps) {
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // The 2D project grid below the canvas is the primary mobile/fallback UI,
  // so we only mount the WebGL universe on tablet-width screens and above.
  if (!webgl || isMobile) return null;

  return (
    <UniverseScene
      slots={slots}
      hovered={hovered}
      staticMode={reduced}
      quality={isMobile ? "low" : "high"}
      onHover={onHover}
      onSelect={onSelect}
    />
  );
}

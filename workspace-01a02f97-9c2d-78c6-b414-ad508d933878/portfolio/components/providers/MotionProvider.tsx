"use client";

import { MotionConfig } from "framer-motion";

/** Respects the user's OS-level reduced-motion preference across all Framer animations. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

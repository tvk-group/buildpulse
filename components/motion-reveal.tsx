"use client";

import type { ReactNode } from "react";

/** Progressive enhancement: no runtime animation package required. */
export function MotionReveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

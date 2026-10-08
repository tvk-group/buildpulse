"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Accessible, transform-only entrance animation for optional page sections. */
export function MotionReveal({ children, className, delay = 0 }: MotionRevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, delay: Math.max(0, Math.min(delay, 1)), ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

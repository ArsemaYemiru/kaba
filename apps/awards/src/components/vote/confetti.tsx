"use client";

import { motion, useReducedMotion } from "motion/react";

import type { Particle } from "./particles";

/** Small gold burst on the first vote in a category (spec §3.5). Nothing under reduced motion. */
export default function ConfettiBurst({ particles }: { particles: Particle[] }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-20">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block h-2.5 w-1.5 rounded-[1px]"
          style={{ backgroundColor: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y + 30, opacity: 0, rotate: p.r, scale: 0.6 }}
          transition={{ duration: p.d + 0.4, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

export type Particle = { id: number; x: number; y: number; r: number; d: number; c: string };

const COLORS = ["#FFB800", "#FFD866", "#B37F00", "#FFFFFF"];

/** Particles are generated in the click handler (never during render). */
export function makeParticles(seed: number): Particle[] {
  return Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + (seed % 7) * 0.1;
    const dist = 40 + ((seed * (i + 3)) % 37);
    return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, r: ((seed * (i + 1)) % 180) - 90, d: 0.5 + ((i * 13) % 5) / 10, c: COLORS[i % COLORS.length]! };
  });
}

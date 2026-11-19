/**
 * §9.6: 12 abstract artworks generated as SVG at seed time: spotlight beams,
 * trophy silhouettes, confetti bursts, gold foil waves and tibeb patterns. Brand colours only,
 * no text, no people. Deterministic (seeded PRNG), so re-seeding is stable.
 */

const C = { bg: "#0A0A0C", surface: "#131317", gold: "#FFB800", red: "#FF3B4E", green: "#1FAA59", white: "#F4F4F5" };
const ACCENTS = [C.gold, C.red, C.green, C.white];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

function frame(w: number, h: number, defs: string, body: string) {
  // Film grain is composited afterwards in sharp (see grainTile): an SVG
  // feTurbulence filter at this size made rasterising ~5x slower.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs><rect width="${w}" height="${h}" fill="${C.bg}"/>${body}</svg>`;
}

export function beams(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const n = 3 + Math.floor(r() * 3);
  let defs = `<radialGradient id="floor" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="${C.gold}" stop-opacity=".22"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#floor)"/>`;
  for (let i = 0; i < n; i++) {
    const color = i === 0 ? C.gold : ACCENTS[Math.floor(r() * 3)]!;
    const x = w * (0.12 + (0.76 * (i + r() * 0.6)) / n);
    const spread = w * (0.12 + r() * 0.14);
    const lean = (r() - 0.5) * w * 0.35;
    defs += `<linearGradient id="b${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".75"/><stop offset=".7" stop-color="${color}" stop-opacity=".12"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
    body += `<polygon points="${f(x - 10)},-20 ${f(x + 10)},-20 ${f(x + lean + spread)},${h} ${f(x + lean - spread)},${h}" fill="url(#b${i})" filter="url(#blur)"/>`;
    body += `<circle cx="${f(x)}" cy="0" r="${f(18 + r() * 14)}" fill="${color}" opacity=".9"/>`;
    body += `<ellipse cx="${f(x + lean)}" cy="${f(h * 0.94)}" rx="${f(spread * 0.9)}" ry="${f(h * 0.05)}" fill="${color}" opacity=".18" filter="url(#blur)"/>`;
  }
  // haze dust
  for (let i = 0; i < 70; i++) body += `<circle cx="${f(r() * w)}" cy="${f(r() * h * 0.85)}" r="${f(0.8 + r() * 2.2)}" fill="${C.white}" opacity="${(0.05 + r() * 0.25).toFixed(2)}"/>`;
  return frame(w, h, defs, body);
}

export function confetti(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const cx = w * (0.35 + r() * 0.3);
  const cy = h * (0.4 + r() * 0.2);
  const defs = `<radialGradient id="burst" cx="${f((cx / w) * 100)}%" cy="${f((cy / h) * 100)}%" r="55%"><stop offset="0" stop-color="${C.gold}" stop-opacity=".45"/><stop offset=".35" stop-color="${C.red}" stop-opacity=".12"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></radialGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#burst)"/>`;
  for (let i = 0; i < 220; i++) {
    const angle = r() * Math.PI * 2;
    const dist = Math.pow(r(), 0.6) * Math.max(w, h) * 0.6;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist * 0.8;
    const color = ACCENTS[Math.floor(r() * ACCENTS.length)]!;
    const s = 6 + r() * 16;
    const rot = r() * 360;
    const op = (0.45 + r() * 0.55).toFixed(2);
    if (r() < 0.6) body += `<rect x="${f(x - s / 2)}" y="${f(y - s / 5)}" width="${f(s)}" height="${f(s / 2.5)}" rx="1.5" fill="${color}" opacity="${op}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    else if (r() < 0.7) body += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s / 3)}" fill="${color}" opacity="${op}"/>`;
    else body += `<polygon points="${f(x)},${f(y - s / 2)} ${f(x + s / 2)},${f(y)} ${f(x)},${f(y + s / 2)} ${f(x - s / 2)},${f(y)}" fill="${color}" opacity="${op}"/>`;
  }
  // streamers
  for (let i = 0; i < 9; i++) {
    const color = ACCENTS[i % 3]!;
    const x0 = cx + (r() - 0.5) * 80;
    const y0 = cy + (r() - 0.5) * 80;
    const x1 = r() * w;
    const y1 = r() < 0.5 ? -40 : h + 40;
    body += `<path d="M${f(x0)} ${f(y0)} Q ${f((x0 + x1) / 2 + (r() - 0.5) * 300)} ${f((y0 + y1) / 2)} ${f(x1)} ${f(y1)}" stroke="${color}" stroke-width="${f(2 + r() * 3)}" fill="none" opacity=".55" stroke-linecap="round"/>`;
  }
  return frame(w, h, defs, body);
}

export function tibeb(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  let body = `<rect width="${w}" height="${h}" fill="${C.surface}"/>`;
  let y = 40 + r() * 60;
  while (y < h - 40) {
    const bandH = 36 + Math.floor(r() * 4) * 18;
    const unit = bandH * (1.4 + r() * 0.8);
    const main = ACCENTS[Math.floor(r() * 3)]!;
    const alt = ACCENTS[Math.floor(r() * 3)]!;
    body += `<rect x="0" y="${f(y)}" width="${w}" height="3" fill="${C.green}"/><rect x="0" y="${f(y + bandH - 3)}" width="${w}" height="3" fill="${C.green}"/>`;
    const style = Math.floor(r() * 3);
    for (let x = -unit; x < w + unit; x += unit) {
      const mx = x + unit / 2;
      const my = y + bandH / 2;
      const s = bandH * 0.36;
      if (style === 0) {
        body += `<polygon points="${f(mx)},${f(my - s)} ${f(mx + s)},${f(my)} ${f(mx)},${f(my + s)} ${f(mx - s)},${f(my)}" fill="${main}"/><polygon points="${f(mx)},${f(my - s / 2.4)} ${f(mx + s / 2.4)},${f(my)} ${f(mx)},${f(my + s / 2.4)} ${f(mx - s / 2.4)},${f(my)}" fill="${C.bg}"/>`;
        body += `<polygon points="${f(x)},${f(my - s / 3)} ${f(x + s / 3)},${f(my)} ${f(x)},${f(my + s / 3)} ${f(x - s / 3)},${f(my)}" fill="${alt}"/>`;
      } else if (style === 1) {
        body += `<polyline points="${f(x)},${f(my + s * 0.6)} ${f(mx)},${f(my - s * 0.6)} ${f(x + unit)},${f(my + s * 0.6)}" fill="none" stroke="${main}" stroke-width="${f(bandH * 0.12)}"/>`;
        body += `<rect x="${f(mx - 3)}" y="${f(my + s * 0.35)}" width="6" height="6" fill="${alt}"/>`;
      } else {
        const step = s / 2;
        body += `<path d="M${f(mx - s)} ${f(my)} h${f(step)} v${f(-step)} h${f(step)} v${f(-step)} h${f(step)} v${f(step)} h${f(step)} v${f(step)} h${f(step)}" fill="none" stroke="${main}" stroke-width="${f(bandH * 0.09)}"/>`;
        body += `<circle cx="${f(x)}" cy="${f(my + s * 0.5)}" r="${f(bandH * 0.07)}" fill="${alt}"/>`;
      }
    }
    y += bandH + 30 + r() * 90;
  }
  const defs = `<radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="${C.bg}" stop-opacity="0"/><stop offset="1" stop-color="${C.bg}" stop-opacity=".85"/></radialGradient>`;
  return frame(w, h, defs, `${body}<rect width="${w}" height="${h}" fill="url(#v)"/>`);
}

const FOIL = `<stop offset="0" stop-color="#B37F00"/><stop offset=".35" stop-color="#FFB800"/><stop offset=".5" stop-color="#FFD866"/><stop offset=".65" stop-color="#FFB800"/><stop offset="1" stop-color="#B37F00"/>`;

/** Trophy silhouette under a spotlight (no text, no people). */
export function trophy(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const cx = w * (0.4 + r() * 0.2);
  const s = Math.min(w, h) * (0.42 + r() * 0.08); // trophy height
  const top = h * 0.5 - s * 0.45;
  const cupW = s * 0.62;
  const defs = `<linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">${FOIL}</linearGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.gold}" stop-opacity=".35"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.white}" stop-opacity=".22"/><stop offset="1" stop-color="${C.white}" stop-opacity="0"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="20"/></filter>`;
  let body = `<polygon points="${f(cx - 20)},-10 ${f(cx + 20)},-10 ${f(cx + s * 0.9)},${h} ${f(cx - s * 0.9)},${h}" fill="url(#cone)" filter="url(#blur)"/>`;
  body += `<ellipse cx="${f(cx)}" cy="${f(top + s * 0.45)}" rx="${f(s * 0.85)}" ry="${f(s * 0.7)}" fill="url(#glow)"/>`;
  const x0 = cx - cupW / 2;
  const x1 = cx + cupW / 2;
  const cupBottom = top + s * 0.42;
  // cup
  body += `<path d="M${f(x0)} ${f(top)} H${f(x1)} V${f(top + s * 0.12)} C${f(x1)} ${f(cupBottom)} ${f(cx + s * 0.06)} ${f(cupBottom + s * 0.04)} ${f(cx)} ${f(cupBottom + s * 0.04)} C${f(cx - s * 0.06)} ${f(cupBottom + s * 0.04)} ${f(x0)} ${f(cupBottom)} ${f(x0)} ${f(top + s * 0.12)} Z" fill="url(#foil)"/>`;
  // handles
  const hw = s * 0.05;
  body += `<path d="M${f(x0)} ${f(top + s * 0.05)} c${f(-s * 0.2)} 0 ${f(-s * 0.22)} ${f(s * 0.24)} ${f(-s * 0.02)} ${f(s * 0.28)}" stroke="url(#foil)" stroke-width="${f(hw)}" fill="none" stroke-linecap="round"/>`;
  body += `<path d="M${f(x1)} ${f(top + s * 0.05)} c${f(s * 0.2)} 0 ${f(s * 0.22)} ${f(s * 0.24)} ${f(s * 0.02)} ${f(s * 0.28)}" stroke="url(#foil)" stroke-width="${f(hw)}" fill="none" stroke-linecap="round"/>`;
  // stem + base
  body += `<rect x="${f(cx - s * 0.05)}" y="${f(cupBottom + s * 0.03)}" width="${f(s * 0.1)}" height="${f(s * 0.22)}" fill="url(#foil)"/>`;
  body += `<rect x="${f(cx - s * 0.2)}" y="${f(cupBottom + s * 0.25)}" width="${f(s * 0.4)}" height="${f(s * 0.08)}" rx="${f(s * 0.02)}" fill="url(#foil)"/>`;
  body += `<rect x="${f(cx - s * 0.28)}" y="${f(cupBottom + s * 0.33)}" width="${f(s * 0.56)}" height="${f(s * 0.1)}" rx="${f(s * 0.02)}" fill="url(#foil)"/>`;
  // sheen + sparkles
  body += `<path d="M${f(x0 + cupW * 0.18)} ${f(top + s * 0.04)} q${f(cupW * 0.05)} ${f(s * 0.2)} ${f(cupW * 0.2)} ${f(s * 0.3)}" stroke="${C.white}" stroke-opacity=".45" stroke-width="${f(s * 0.02)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 26; i++) {
    const x = cx + (r() - 0.5) * s * 2.2;
    const y = top + (r() - 0.2) * s * 1.2;
    const z = 2 + r() * 6;
    body += `<path d="M${f(x)} ${f(y - z)} L${f(x + z * 0.3)} ${f(y)} L${f(x)} ${f(y + z)} L${f(x - z * 0.3)} ${f(y)} Z" fill="${r() < 0.7 ? C.gold : C.white}" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  }
  body += `<rect x="0" y="${f(h * 0.93)}" width="${w}" height="${f(h * 0.07)}" fill="${C.surface}"/>`;
  return frame(w, h, defs, body);
}

/** Layered gold-foil waves. */
export function foilWaves(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const defs = `<linearGradient id="foil" x1="0" y1="0" x2="1" y2="0">${FOIL}</linearGradient>
<radialGradient id="bloom" cx="${f(30 + r() * 40)}%" cy="40%" r="60%"><stop offset="0" stop-color="${C.gold}" stop-opacity=".25"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></radialGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#bloom)"/>`;
  const layers = 9;
  for (let i = 0; i < layers; i++) {
    const base = h * (0.2 + (i / layers) * 0.75);
    const amp = h * (0.04 + r() * 0.08);
    const ph = r() * Math.PI * 2;
    const k = (1.2 + r() * 1.6) * (Math.PI * 2) / w;
    let d = `M0 ${f(base)}`;
    for (let x = 0; x <= w; x += w / 40) d += ` L${f(x)} ${f(base + Math.sin(x * k + ph) * amp)}`;
    const fillD = `${d} L${w} ${h} L0 ${h} Z`;
    body += `<path d="${fillD}" fill="${C.bg}" opacity="${(0.55 + i * 0.03).toFixed(2)}"/>`;
    body += `<path d="${d}" stroke="url(#foil)" stroke-width="${f(1.5 + r() * 3)}" fill="none" opacity="${(0.45 + r() * 0.55).toFixed(2)}"/>`;
  }
  return frame(w, h, defs, body);
}

/** 256×256 RGBA white-noise tile at ~5% alpha, tiled over each artwork. */
export function grainTile(seed = 7): { data: Buffer; size: number } {
  const size = 256;
  const r = rng(seed);
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(r() * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 13;
  }
  return { data, size };
}

export type Artwork = { slug: string; album: string; svg: string; alt: string; tags: string[] };

export const ALBUMS = [
  { slug: "red-carpet", titleEn: "Red Carpet", descriptionEn: "Arrivals, lights and gold on the red carpet." },
  { slug: "awards-night", titleEn: "Awards Night", descriptionEn: "The stage, the trophies and the big moments." },
  { slug: "backstage", titleEn: "Backstage", descriptionEn: "Behind the curtain on awards night." },
] as const;

export function artworks(): Artwork[] {
  const PORTRAIT: [number, number] = [1000, 1300];
  return [
    { slug: "red-carpet-01", album: "red-carpet", svg: beams(11), alt: "Abstract artwork: gold spotlight beams over a dark stage", tags: ["beams"] },
    { slug: "red-carpet-02", album: "red-carpet", svg: foilWaves(21, ...PORTRAIT), alt: "Abstract artwork: layered gold foil waves", tags: ["foil"] },
    { slug: "red-carpet-03", album: "red-carpet", svg: confetti(31), alt: "Abstract artwork: a burst of gold, red and green confetti", tags: ["confetti"] },
    { slug: "red-carpet-04", album: "red-carpet", svg: beams(47, ...PORTRAIT), alt: "Abstract artwork: crossing spotlights in gold and red", tags: ["beams"] },
    { slug: "awards-night-01", album: "awards-night", svg: trophy(5), alt: "Abstract artwork: a gold trophy silhouette under a spotlight", tags: ["trophy"] },
    { slug: "awards-night-02", album: "awards-night", svg: trophy(17, ...PORTRAIT), alt: "Abstract artwork: a gold trophy glowing on a dark stage", tags: ["trophy"] },
    { slug: "awards-night-03", album: "awards-night", svg: foilWaves(29), alt: "Abstract artwork: gold foil waves across the frame", tags: ["foil"] },
    { slug: "awards-night-04", album: "awards-night", svg: confetti(61, ...PORTRAIT), alt: "Abstract artwork: falling gold and green confetti", tags: ["confetti"] },
    { slug: "backstage-01", album: "backstage", svg: tibeb(3), alt: "Abstract artwork: woven-style geometric bands in green, gold and red", tags: ["tibeb"] },
    { slug: "backstage-02", album: "backstage", svg: tibeb(71, ...PORTRAIT), alt: "Abstract artwork: stacked tibeb-inspired pattern bands", tags: ["tibeb"] },
    { slug: "backstage-03", album: "backstage", svg: trophy(83), alt: "Abstract artwork: a trophy outline with gold sparkles", tags: ["trophy"] },
    { slug: "backstage-04", album: "backstage", svg: confetti(97), alt: "Abstract artwork: confetti and streamers bursting from the centre", tags: ["confetti"] },
  ];
}

export const HERO_POSTER = "red-carpet-01";
export const OG_IMAGE = "awards-night-01";

/**
 * §8.6: 12 abstract artworks generated as SVG at seed time: spotlight beams,
 * confetti bursts, tibeb patterns and VS slashes. Brand colours only,
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

export function vsSlash(seed: number, w = 1600, h = 1000): string {
  const r = rng(seed);
  const pairs = [[C.gold, C.red], [C.red, C.green], [C.green, C.gold]] as const;
  const [left, right] = pairs[Math.floor(r() * pairs.length)]!;
  const top = w * (0.52 + r() * 0.08);
  const bottom = w * (0.4 + r() * 0.08);
  const cx = (top + bottom) / 2;
  const cy = h * 0.5;
  const defs = `<linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${left}" stop-opacity=".55"/><stop offset="1" stop-color="${C.bg}" stop-opacity=".9"/></linearGradient>
<linearGradient id="r" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${right}" stop-opacity=".55"/><stop offset="1" stop-color="${C.bg}" stop-opacity=".9"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${C.red}" stop-opacity=".7"/><stop offset="1" stop-color="${C.red}" stop-opacity="0"/></radialGradient><filter id="sb"><feGaussianBlur stdDeviation="10"/></filter>`;
  let body = `<polygon points="0,0 ${f(top)},0 ${f(bottom)},${h} 0,${h}" fill="url(#l)"/><polygon points="${f(top)},0 ${w},0 ${w},${h} ${f(bottom)},${h}" fill="url(#r)"/>`;
  // speed lines
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0;
    const y = r() * h;
    const len = 120 + r() * 380;
    const x = side ? r() * (bottom - len) : top + r() * (w - top - len);
    body += `<rect x="${f(x)}" y="${f(y)}" width="${f(len)}" height="${f(1 + r() * 3)}" fill="${side ? left : right}" opacity="${(0.15 + r() * 0.35).toFixed(2)}"/>`;
  }
  body += `<line x1="${f(top)}" y1="-10" x2="${f(bottom)}" y2="${h + 10}" stroke="${C.gold}" stroke-width="22" opacity=".35" filter="url(#sb)"/>`;
  body += `<line x1="${f(top)}" y1="-10" x2="${f(bottom)}" y2="${h + 10}" stroke="${C.bg}" stroke-width="14"/>`;
  body += `<line x1="${f(top)}" y1="-10" x2="${f(bottom)}" y2="${h + 10}" stroke="${C.gold}" stroke-width="3"/>`;
  body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(h * 0.32)}" fill="url(#glow)"/>`;
  body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(h * 0.12)}" fill="${C.red}" stroke="${C.gold}" stroke-width="12"/>`;
  body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(h * 0.06)}" fill="none" stroke="${C.bg}" stroke-width="6" opacity=".5"/>`;
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
  { slug: "studio-nights", titleEn: "Studio Nights", descriptionEn: "Stage lights and late-night energy from the Feta studio." },
  { slug: "matchups", titleEn: "Matchups", descriptionEn: "Two sides, one stage: the VS spirit of Feta." },
  { slug: "holiday-special", titleEn: "Holiday Special", descriptionEn: "Confetti, colour and team battles." },
] as const;

export function artworks(): Artwork[] {
  const PORTRAIT: [number, number] = [1000, 1300];
  return [
    { slug: "studio-nights-01", album: "studio-nights", svg: beams(11), alt: "Abstract artwork: gold stage-light beams over a dark studio floor", tags: ["beams"] },
    { slug: "studio-nights-02", album: "studio-nights", svg: beams(23, ...PORTRAIT), alt: "Abstract artwork: crossing spotlights in gold and red", tags: ["beams"] },
    { slug: "studio-nights-03", album: "studio-nights", svg: confetti(31), alt: "Abstract artwork: a burst of gold, red and green confetti", tags: ["confetti"] },
    { slug: "studio-nights-04", album: "studio-nights", svg: beams(47), alt: "Abstract artwork: stage beams cutting through haze", tags: ["beams"] },
    { slug: "matchups-01", album: "matchups", svg: vsSlash(5), alt: "Abstract artwork: two coloured halves split by a gold diagonal slash", tags: ["vs"] },
    { slug: "matchups-02", album: "matchups", svg: vsSlash(17, ...PORTRAIT), alt: "Abstract artwork: a red and gold versus badge on a split background", tags: ["vs"] },
    { slug: "matchups-03", album: "matchups", svg: vsSlash(29), alt: "Abstract artwork: speed lines racing toward a central slash", tags: ["vs"] },
    { slug: "matchups-04", album: "matchups", svg: tibeb(3), alt: "Abstract artwork: woven-style geometric bands in green, gold and red", tags: ["tibeb"] },
    { slug: "holiday-special-01", album: "holiday-special", svg: confetti(61), alt: "Abstract artwork: confetti and streamers bursting from the centre", tags: ["confetti"] },
    { slug: "holiday-special-02", album: "holiday-special", svg: tibeb(71, ...PORTRAIT), alt: "Abstract artwork: stacked tibeb-inspired pattern bands", tags: ["tibeb"] },
    { slug: "holiday-special-03", album: "holiday-special", svg: confetti(83, ...PORTRAIT), alt: "Abstract artwork: falling gold and green confetti", tags: ["confetti"] },
    { slug: "holiday-special-04", album: "holiday-special", svg: tibeb(97), alt: "Abstract artwork: chevron and diamond pattern stripes", tags: ["tibeb"] },
  ];
}

export const HERO_POSTER = "studio-nights-01";
export const OG_IMAGE = "matchups-01";

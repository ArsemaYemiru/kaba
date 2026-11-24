import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getStorage } from "@/lib/storage";

/**
 * Social share images (spec §10): 1200×630, Gold Night look, English + Amharic.
 * Callers pass only names, genres and editions.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const FONT_DIR = path.join(process.cwd(), "assets", "og-fonts");
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 500 | 700 | 800; style: "normal" }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(FONT_DIR, "unbounded-latin-800-normal.woff")).then((b) => ({ name: "Unbounded", data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, weight: 800 as const, style: "normal" as const })),
    readFile(path.join(FONT_DIR, "inter-latin-500-normal.woff")).then((b) => ({ name: "Inter", data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, weight: 500 as const, style: "normal" as const })),
    readFile(path.join(FONT_DIR, "noto-sans-ethiopic-ethiopic-700-normal.woff")).then((b) => ({ name: "Noto Sans Ethiopic", data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, weight: 700 as const, style: "normal" as const })),
  ]);
  return fonts;
}

/** A stored image (smallest variant ≥ 800px) as a PNG data URL, or null. */
export async function mediaDataUrl(m: { storageKey: string; variants: unknown } | null | undefined): Promise<string | null> {
  if (!m) return null;
  try {
    const variants = (m.variants as Record<string, string> | null) ?? {};
    const key = variants["800"] ?? variants["1600"] ?? m.storageKey;
    const storage = getStorage();
    const head = await storage.head(key);
    if (!head || head.size > 8_000_000) return null;
    const bytes = await storage.readStart(key, head.size);
    if (!bytes) return null;
    const png = await sharp(bytes).resize(560, 700, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

const TIBEB = ["#078930", "#FCDD09", "#DA121A", "#FFB800", "#078930", "#FCDD09", "#DA121A", "#FFB800"];

type Card = {
  kicker: string;
  title: string;
  titleAm?: string | null;
  subtitle?: string | null;
  image?: string | null;
  /** Initials / ፈታ shown when there's no image. */
  fallback?: string;
};

export async function ogCard(c: Card) {
  const titleSize = c.title.length > 34 ? 52 : c.title.length > 22 ? 64 : 78;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: "#0A0A0C", backgroundImage: "radial-gradient(ellipse 70% 80% at 20% 15%, rgba(255,184,0,0.28) 0%, rgba(10,10,12,0) 70%)", color: "#F4F4F5", fontFamily: "Inter", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px 64px", flex: 1, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontFamily: "Noto Sans Ethiopic", fontSize: 46, color: "#FFB800" }}>ፈታ</span>
            <span style={{ fontFamily: "Unbounded", fontSize: 22, letterSpacing: 6, color: "#FFB800" }}>FETA AWARDS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: c.image || c.fallback ? 680 : 1060 }}>
            <span style={{ fontFamily: "Unbounded", fontSize: 24, letterSpacing: 5, color: "#FFB800" }}>{c.kicker.toUpperCase()}</span>
            <span style={{ fontFamily: "Unbounded", fontSize: titleSize, lineHeight: 1.05 }}>{c.title}</span>
            {c.titleAm ? <span style={{ fontFamily: "Noto Sans Ethiopic", fontSize: 38, color: "#FFB800" }}>{c.titleAm}</span> : null}
            {c.subtitle ? <span style={{ fontSize: 30, color: "#C9C9D1" }}>{c.subtitle}</span> : null}
          </div>
          <div style={{ display: "flex", gap: 0, width: 420, height: 10 }}>
            {TIBEB.map((col, i) => (
              <div key={i} style={{ flex: 1, height: 10, background: col, display: "flex" }} />
            ))}
          </div>
        </div>
        {c.image || c.fallback ? (
          <div style={{ display: "flex", alignItems: "center", paddingRight: 64 }}>
            <div
              style={{
                width: 400,
                height: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 28,
                overflow: "hidden",
                border: "2px solid #2A2A32",
                background: "linear-gradient(160deg, #3a2a05 0%, #131317 70%)",
              }}
            >
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- next/og renders <img>
                <img src={c.image} width={400} height={500} style={{ objectFit: "cover" }} alt="" />
              ) : (
                <span style={{ fontFamily: c.fallback && /\p{Script=Ethiopic}/u.test(c.fallback) ? "Noto Sans Ethiopic" : "Unbounded", fontSize: 150, color: "rgba(255,184,0,0.85)" }}>{c.fallback}</span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts(), headers: { "cache-control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

import { readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * IDs of every Server Action defined under src/server/actions/admin/, read from
 * the build's action manifest. Actions are routed by ID from ANY URL, so the
 * proxy uses this to give admin actions the same staff gate as /admin pages
 * (real 401/403 status codes; A-47). The actions re-check with authorizeStaff().
 */
const CANDIDATES = [".next/server/server-reference-manifest.json", ".next/dev/server/server-reference-manifest.json"];
let cache: { file: string; mtime: number; ids: Set<string> } | null = null;

function load(): Set<string> {
  for (const rel of CANDIDATES) {
    // The manifest is always part of the build output; don't trace the whole project for it.
    const file = path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
    let mtime: number;
    try {
      mtime = statSync(/*turbopackIgnore: true*/ file).mtimeMs;
    } catch {
      continue;
    }
    if (cache && cache.file === file && cache.mtime === mtime) return cache.ids;
    try {
      const manifest = JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as { node?: Record<string, { filename?: string }> };
      const ids = new Set(Object.entries(manifest.node ?? {}).filter(([, v]) => v.filename?.includes("server/actions/admin/")).map(([id]) => id));
      cache = { file, mtime, ids };
      return ids;
    } catch {
      continue;
    }
  }
  return cache?.ids ?? new Set();
}

export function isAdminAction(actionId: string | null): boolean {
  return !!actionId && load().has(actionId);
}

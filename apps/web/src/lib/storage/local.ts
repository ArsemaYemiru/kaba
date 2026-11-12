import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidKey, type PresignedUpload, type PutOptions, type StorageDriver } from "./types";

/**
 * Local filesystem driver (development). Files live under ./storage and are
 * served by the /media/[...key] route with long-lived cache headers.
 */
export class LocalStorage implements StorageDriver {
  readonly name = "local" as const;
  readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  resolve(key: string): string {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Key escapes storage root");
    return full;
  }

  async put(key: string, body: Buffer | Uint8Array, _opts?: PutOptions): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  getUrl(key: string): string {
    assertValidKey(key);
    return `/media/${key}`;
  }

  async createPresignedUpload(key: string, opts: { contentType: string; sizeBytes: number }): Promise<PresignedUpload> {
    assertValidKey(key);
    // Dev stand-in for an R2 presigned PUT; the route is added in Phase 5.
    return {
      kind: "single",
      method: "PUT",
      url: `/api/admin/media/video/dev-upload?key=${encodeURIComponent(key)}`,
      headers: { "content-type": opts.contentType },
    };
  }

  /** Used only by the /media route. Returns null when missing. */
  async open(key: string): Promise<{ stream: NodeJS.ReadableStream; size: number } | null> {
    let file: string;
    try {
      file = this.resolve(key);
    } catch {
      return null;
    }
    try {
      const s = await stat(file);
      if (!s.isFile()) return null;
      return { stream: createReadStream(file), size: s.size };
    } catch {
      return null;
    }
  }
}

import { createReadStream } from "node:fs";
import { mkdir, open as openFile, rm, stat, writeFile } from "node:fs/promises";
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

  async completeUpload(): Promise<void> {
    /* single PUT to the dev route: nothing to finish */
  }

  async head(key: string): Promise<{ size: number } | null> {
    try {
      const s = await stat(this.resolve(key));
      return s.isFile() ? { size: s.size } : null;
    } catch {
      return null;
    }
  }

  async readStart(key: string, bytes: number): Promise<Uint8Array | null> {
    try {
      const fh = await openFile(this.resolve(key), "r");
      try {
        const buf = Buffer.alloc(bytes);
        const { bytesRead } = await fh.read(buf, 0, bytes, 0);
        return buf.subarray(0, bytesRead);
      } finally {
        await fh.close();
      }
    } catch {
      return null;
    }
  }

  /** Dev video upload target: stream a request body to disk with a byte cap. */
  async putStream(key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    const { createWriteStream } = await import("node:fs");
    const out = createWriteStream(file);
    let total = 0;
    try {
      const reader = body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) throw new Error("too-large");
        if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
      }
      await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
      return total;
    } catch (err) {
      out.destroy();
      await rm(file, { force: true });
      throw err;
    }
  }

  /** Used only by the /media route. Returns null when missing. */
  async open(key: string, range?: { start: number; end: number }): Promise<{ stream: NodeJS.ReadableStream; size: number } | null> {
    let file: string;
    try {
      file = this.resolve(key);
    } catch {
      return null;
    }
    try {
      const s = await stat(file);
      if (!s.isFile()) return null;
      return { stream: createReadStream(file, range ? { start: range.start, end: range.end } : undefined), size: s.size };
    } catch {
      return null;
    }
  }
}

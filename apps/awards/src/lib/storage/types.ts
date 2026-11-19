export type PutOptions = {
  contentType: string;
  /** Defaults to a one-year immutable cache: keys are never reused. */
  cacheControl?: string;
};

export type PresignedUpload =
  | { kind: "single"; method: "PUT"; url: string; headers: Record<string, string> }
  | { kind: "multipart"; uploadId: string; partSize: number; partUrls: string[] };

export type CompletedPart = { partNumber: number; etag: string };

export interface StorageDriver {
  readonly name: "local" | "r2";
  put(key: string, body: Buffer | Uint8Array, opts: PutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  /** Public URL for a stored object. */
  getUrl(key: string): string;
  /** Direct browser upload target (R2 presigned in prod, app route in dev). */
  createPresignedUpload(key: string, opts: { contentType: string; sizeBytes: number }): Promise<PresignedUpload>;
  /** Finish a multipart upload (no-op for single uploads). */
  completeUpload(key: string, opts: { uploadId?: string; parts?: CompletedPart[] }): Promise<void>;
  /** Size of a stored object, or null if missing. */
  head(key: string): Promise<{ size: number } | null>;
  /** First bytes of an object (for magic-byte checks after direct uploads). */
  readStart(key: string, bytes: number): Promise<Uint8Array | null>;
}

export const IMMUTABLE = "public, max-age=31536000, immutable";

/** Keys are lowercase path segments: letters, digits, dash, underscore, dot. */
const KEY_RE = /^(?:[a-z0-9][a-z0-9_.-]*\/)*[a-z0-9][a-z0-9_.-]*$/;

export function assertValidKey(key: string): void {
  if (!KEY_RE.test(key) || key.includes("..") || key.length > 300) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

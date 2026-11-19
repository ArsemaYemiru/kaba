import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertValidKey, IMMUTABLE, type CompletedPart, type PresignedUpload, type PutOptions, type StorageDriver } from "./types";

/** Uploads at or below this size use one presigned PUT; larger ones go multipart. */
export const SINGLE_PUT_MAX = 64 * 1024 * 1024;
export const PART_SIZE = 16 * 1024 * 1024; // R2 needs ≥5 MiB parts (except the last)
const URL_TTL = 60 * 60; // presigned URLs valid for 1 hour

export type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string };

/**
 * Cloudflare R2 via the S3 API (spec §6). Videos go browser → R2 directly
 * with presigned URLs (multipart for large files), so they never pass through
 * Cloudflare's 100 MB request-body limit. The bucket CORS must allow PUT from
 * the site origin and expose the ETag header (see deploy/cloudflare.md).
 */
export class R2Storage implements StorageDriver {
  readonly name = "r2" as const;
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(cfg: R2Config, client?: S3Client) {
    this.bucket = cfg.bucket;
    this.publicUrl = cfg.publicUrl.replace(/\/+$/, "");
    this.s3 =
      client ??
      new S3Client({
        region: "auto",
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      });
  }

  async put(key: string, body: Buffer | Uint8Array, opts: PutOptions): Promise<void> {
    assertValidKey(key);
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: opts.contentType, CacheControl: opts.cacheControl ?? IMMUTABLE }));
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  getUrl(key: string): string {
    assertValidKey(key);
    return `${this.publicUrl}/${key}`;
  }

  async createPresignedUpload(key: string, opts: { contentType: string; sizeBytes: number }): Promise<PresignedUpload> {
    assertValidKey(key);
    if (opts.sizeBytes <= SINGLE_PUT_MAX) {
      const url = await getSignedUrl(
        this.s3,
        new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: opts.contentType, CacheControl: IMMUTABLE }),
        { expiresIn: URL_TTL },
      );
      return { kind: "single", method: "PUT", url, headers: { "content-type": opts.contentType } };
    }
    const created = await this.s3.send(
      new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: opts.contentType, CacheControl: IMMUTABLE }),
    );
    if (!created.UploadId) throw new Error("R2 did not return an UploadId");
    const parts = Math.ceil(opts.sizeBytes / PART_SIZE);
    const partUrls = await Promise.all(
      Array.from({ length: parts }, (_, i) =>
        getSignedUrl(this.s3, new UploadPartCommand({ Bucket: this.bucket, Key: key, UploadId: created.UploadId, PartNumber: i + 1 }), { expiresIn: URL_TTL }),
      ),
    );
    return { kind: "multipart", uploadId: created.UploadId, partSize: PART_SIZE, partUrls };
  }

  async completeUpload(key: string, opts: { uploadId?: string; parts?: CompletedPart[] }): Promise<void> {
    assertValidKey(key);
    if (!opts.uploadId) return; // single PUT: nothing to finish
    const parts = [...(opts.parts ?? [])].sort((a, b) => a.partNumber - b.partNumber);
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: opts.uploadId,
        MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) },
      }),
    );
  }

  async head(key: string): Promise<{ size: number } | null> {
    assertValidKey(key);
    try {
      const r = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: r.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }

  async readStart(key: string, bytes: number): Promise<Uint8Array | null> {
    assertValidKey(key);
    try {
      const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
      return r.Body ? await r.Body.transformToByteArray() : null;
    } catch {
      return null;
    }
  }
}

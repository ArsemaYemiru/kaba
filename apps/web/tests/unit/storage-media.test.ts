import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sniff } from "@/lib/media/sniff";
import { LocalStorage } from "@/lib/storage/local";
import { assertValidKey } from "@/lib/storage/types";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "feta-storage-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("storage keys", () => {
  it.each(["a.webp", "uploads/2026/abc-123_x.webp", "sample/studio-nights-01-400.webp"])("accepts %s", (k) => {
    expect(() => assertValidKey(k)).not.toThrow();
  });
  it.each(["../etc/passwd", "a/../../b", "/abs", "UPPER.webp", "a//b", "", "sp ace.webp", ".hidden"])("rejects %j", (k) => {
    expect(() => assertValidKey(k)).toThrow();
  });
});

describe("LocalStorage", () => {
  it("writes, serves and deletes inside its root", async () => {
    const s = new LocalStorage(dir);
    await s.put("a/b.webp", Buffer.from("hello"), { contentType: "image/webp" });
    expect(await readFile(path.join(dir, "a/b.webp"), "utf8")).toBe("hello");
    expect(s.getUrl("a/b.webp")).toBe("/media/a/b.webp");
    expect((await s.open("a/b.webp"))?.size).toBe(5);
    expect(await s.open("../outside")).toBeNull();
    await s.delete("a/b.webp");
    expect(await s.open("a/b.webp")).toBeNull();
  });
});

describe("sniff (magic bytes, not extensions)", () => {
  it("detects a real PNG", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffb800" } }).png().toBuffer();
    expect(await sniff(png)).toMatchObject({ ok: true, kind: "image", mime: "image/png" });
  });
  it("rejects a text file pretending to be an image", async () => {
    expect((await sniff(Buffer.from("<?php echo 'hi'; ?>"))).ok).toBe(false);
  });
  it("rejects disallowed types like GIF with a clear message", async () => {
    const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#000" } }).gif().toBuffer();
    const r = await sniff(gif);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/aren't allowed/);
  });
});

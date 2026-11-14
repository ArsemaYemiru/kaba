import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { exists } = vi.hoisted(() => ({ exists: vi.fn() }));
vi.mock("@/server/queries/public-route", () => ({ publicDetailExists: exists }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next-intl/middleware", () => ({ default: () => () => NextResponse.next() }));

import proxy from "@/proxy";

describe("public detail status before streaming", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows published content", async () => {
    exists.mockResolvedValue(true);
    const response = await proxy(new NextRequest("http://localhost/artists/betty-g"));
    expect(response.status).toBe(200);
  });

  it.each(["/artists/draft", "/en/news/scheduled", "/gallery/missing", "/episodes/missing"])(
    "sends a real 404 for unavailable %s",
    async (pathname) => {
      exists.mockResolvedValue(false);
      const response = await proxy(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("Page not found");
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );

  it("does not look up records for listing pages", async () => {
    expect((await proxy(new NextRequest("http://localhost/artists"))).status).toBe(200);
    expect(exists).not.toHaveBeenCalled();
  });

  it("rejects a malformed encoded slug", async () => {
    expect((await proxy(new NextRequest("http://localhost/artists/%ZZ"))).status).toBe(400);
    expect(exists).not.toHaveBeenCalled();
  });
});

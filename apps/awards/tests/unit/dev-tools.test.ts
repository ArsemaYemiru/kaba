import { afterEach, describe, expect, it, vi } from "vitest";
import { devToolsEnabled } from "@/server/dev/tools";

describe("dev tools gate (A-38)", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("is off unless ENABLE_DEV_TOOLS=1", () => {
    vi.stubEnv("ENABLE_DEV_TOOLS", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3001");
    expect(devToolsEnabled()).toBe(false);
  });
  it("is on for localhost only", () => {
    vi.stubEnv("ENABLE_DEV_TOOLS", "1");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3001");
    expect(devToolsEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://fetaawards.com");
    expect(devToolsEnabled()).toBe(false);
  });
});

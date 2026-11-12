import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Server Actions re-check the session and role themselves (spec §5),
 * independent of the proxy. Better Auth's getSession and the DB are mocked.
 */
const getSession = vi.fn();
const settingsUpdate = vi.fn();
const userUpdate = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("@/lib/activity", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    siteSettings: { update: settingsUpdate },
    user: { update: userUpdate, findUnique: vi.fn(async () => ({ email: "x@y.z", role: "EDITOR" })), count: vi.fn(async () => 1) },
    session: { deleteMany: vi.fn() },
    $transaction: vi.fn(async () => []),
  },
}));

const as = (role: "SUPER_ADMIN" | "EDITOR", extra: Record<string, unknown> = {}) =>
  getSession.mockResolvedValue({
    session: { id: "s" },
    user: { id: "u1", name: "Test", email: "t@example.test", role, isActive: true, mustChangePassword: false, ...extra },
  });

describe("Server Action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveSettingsSection: 401 when signed out", async () => {
    getSession.mockResolvedValue(null);
    const { saveSettingsSection } = await import("@/server/actions/settings");
    expect(await saveSettingsSection({ section: "contact", data: {} })).toMatchObject({ ok: false, status: 401 });
    expect(settingsUpdate).not.toHaveBeenCalled();
  });

  it("saveSettingsSection: 403 for an EDITOR, DB untouched", async () => {
    as("EDITOR");
    const { saveSettingsSection } = await import("@/server/actions/settings");
    expect(await saveSettingsSection({ section: "contact", data: { email: "hacked@example.test" } })).toEqual({ ok: false, status: 403, error: "forbidden" });
    expect(settingsUpdate).not.toHaveBeenCalled();
  });

  it("saveSettingsSection: 401 while a password change is pending", async () => {
    as("SUPER_ADMIN", { mustChangePassword: true });
    const { saveSettingsSection } = await import("@/server/actions/settings");
    expect(await saveSettingsSection({ section: "contact", data: {} })).toMatchObject({ ok: false, status: 401, error: "passwordChangeRequired" });
  });

  it("saveSettingsSection: deactivated users are treated as signed out", async () => {
    as("SUPER_ADMIN", { isActive: false });
    const { saveSettingsSection } = await import("@/server/actions/settings");
    expect(await saveSettingsSection({ section: "contact", data: {} })).toMatchObject({ ok: false, status: 401 });
  });

  it("saveSettingsSection: SUPER_ADMIN passes auth, then input is validated", async () => {
    as("SUPER_ADMIN");
    const { saveSettingsSection } = await import("@/server/actions/settings");
    expect(await saveSettingsSection({ section: "contact", data: { email: "not-an-email" } })).toMatchObject({ ok: false, status: 400 });
    expect(await saveSettingsSection({ section: "nope", data: {} })).toMatchObject({ ok: false, status: 400 });
    expect(await saveSettingsSection({ section: "contact", data: { email: "hello@example.test" } })).toEqual({ ok: true });
    expect(settingsUpdate).toHaveBeenCalledOnce();
  });

  it("setUserActive: 403 for an EDITOR", async () => {
    as("EDITOR");
    const { setUserActive } = await import("@/server/actions/users");
    expect(await setUserActive({ userId: "u2", active: false })).toEqual({ ok: false, status: 403, error: "forbidden" });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("setUserActive: a super admin can't deactivate themselves", async () => {
    as("SUPER_ADMIN");
    const { setUserActive } = await import("@/server/actions/users");
    expect(await setUserActive({ userId: "u1", active: false })).toMatchObject({ ok: false, status: 409 });
  });
});

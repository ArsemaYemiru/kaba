import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

/**
 * Throwaway staff accounts for e2e (there is no public sign-up, A-77). Uses the
 * e2e+<run>…@example.org pattern; `deleteTestStaff(run)` removes them and their activity.
 */
export const DB = process.env.DATABASE_URL ?? "postgresql://feta:feta@localhost:5436/feta_awards";

export async function db<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export async function createStaff(email: string, password: string, role: "SUPER_ADMIN" | "EDITOR", opts: { mustChangePassword?: boolean; name?: string } = {}) {
  const id = randomUUID();
  const hash = await hashPassword(password);
  await db(
    `INSERT INTO "user" (id, name, "displayName", email, "emailNormalized", "emailVerified", role, "mustChangePassword", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $2, $3, $3, true, $4, $5, true, now(), now())`,
    [id, opts.name ?? "E2E Staff", email, role, opts.mustChangePassword ?? false],
  );
  await db(`INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, 'credential', $2, $3, now(), now())`, [randomUUID(), id, hash]);
  return id;
}

/** Removes only this run's accounts (`e2e+<run>…`), so specs running side by side never delete each other's. */
export async function deleteTestStaff(run: string) {
  const like = `e2e+${run}%@example.org`;
  await db(`DELETE FROM "ActivityLog" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`, [like]);
  await db(`DELETE FROM "user" WHERE email LIKE $1`, [like]);
}

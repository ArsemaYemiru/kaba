/**
 * Reset an admin's password from the server (e.g. a locked-out super admin).
 *   pnpm admin:reset-password <email> [newPassword]
 * Without a password, the user's seeded default is restored (dev only).
 * The user must change it on next login; all their sessions are revoked.
 */
import "../prisma/seed/load-env";
import { prisma } from "../src/lib/db";
import { upsertCredentialUser } from "./user-admin";

const [email, given] = process.argv.slice(2);
const defaults: Record<string, string | undefined> = {
  [(process.env.SEED_ADMIN_EMAIL || "admin@fetashow.com").toLowerCase()]: process.env.SEED_ADMIN_PASSWORD || "Feta#Admin2026",
  [(process.env.SEED_EDITOR_EMAIL || "editor@fetashow.com").toLowerCase()]: process.env.SEED_EDITOR_PASSWORD || "Feta#Editor2026",
};

async function main() {
  if (!email) throw new Error("Usage: pnpm admin:reset-password <email> [newPassword]");
  const password = given ?? defaults[email.toLowerCase()];
  if (!password) throw new Error("Pass a new password (no seeded default for this email).");
  if (!given && process.env.NODE_ENV === "production") throw new Error("Refusing to restore a seeded default password in production.");
  await upsertCredentialUser({ email, password, mustChangePassword: true });
  console.log(`Password reset for ${email}. They must change it on next login; all sessions revoked.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

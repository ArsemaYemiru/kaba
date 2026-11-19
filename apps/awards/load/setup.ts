/**
 * k6 load-test fixtures (spec §11): N verified members with real Better Auth
 * sessions, plus the vote targets. Run ONLY against a throwaway database:
 *   DATABASE_URL=…/feta_awards_load pnpm load:setup
 * Writes load/.fixtures.json (gitignored).
 */
import "../prisma/seed/load-env";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/email";

const N = Number(process.env.LOAD_MEMBERS ?? 1000);
const PASSWORD = "Load-test-password-2026";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/feta_awards_load/.test(url)) throw new Error(`Refusing to run: DATABASE_URL must point at the throwaway feta_awards_load database (got ${url.replace(/:[^:@/]+@/, ":***@")}).`);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(PASSWORD); // one hash for all load members (setup speed)
  const emails = Array.from({ length: N }, (_, i) => `load+${String(i + 1).padStart(4, "0")}@example.com`);
  await prisma.user.createMany({
    data: emails.map((email) => ({ name: "Load Member", displayName: "Load Member", email, emailNormalized: normalizeEmail(email), emailVerified: true, consentAt: new Date(), isSample: true })),
    skipDuplicates: true,
  });
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  await prisma.account.createMany({ data: users.map((u) => ({ userId: u.id, accountId: u.id, providerId: "credential", password: hash })), skipDuplicates: true });

  // Real sessions through Better Auth (signed cookies), a few at a time.
  const members: { cookie: string; ip: string }[] = [];
  for (let i = 0; i < users.length; i += 16) {
    const batch = await Promise.all(
      users.slice(i, i + 16).map(async (u, j) => {
        const res = await auth.api.signInEmail({ body: { email: u.email, password: PASSWORD }, asResponse: true });
        const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
        const n = i + j;
        return { cookie, ip: `10.${100 + Math.floor(n / 250)}.${n % 250}.${7 + (n % 200)}` };
      }),
    );
    members.push(...batch);
  }

  const edition = await prisma.awardEdition.findFirstOrThrow({ where: { phase: "VOTING_OPEN" }, select: { id: true } });
  const categories = await prisma.awardCategory.findMany({
    where: { editionId: edition.id, status: "PUBLISHED", votingType: { in: ["PUBLIC_VOTE", "HYBRID"] } },
    select: { id: true, nominees: { where: { status: "PUBLISHED" }, select: { id: true } } },
  });
  const targets = categories.map((c) => ({ categoryId: c.id, nomineeIds: c.nominees.map((n) => n.id) }));
  writeFileSync(path.join(__dirname, ".fixtures.json"), JSON.stringify({ members, targets }));
  console.info(`load fixtures: ${members.length} members, ${targets.length} categories → load/.fixtures.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

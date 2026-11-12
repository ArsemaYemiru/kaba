/** e2e fixtures: dedicated test admins, so tests never touch the seeded logins. */
import "../prisma/seed/load-env";
import { prisma } from "../src/lib/db";
import { getStorage } from "../src/lib/storage";
import { upsertCredentialUser } from "./user-admin";

export const E2E = {
  super: { email: "e2e-super@example.test", password: "E2E#SuperStart1", name: "E2E Super" },
  editor: { email: "e2e-editor@example.test", password: "E2E#EditorPass1", name: "E2E Editor" },
  victim: { email: "e2e-ratelimit@example.test", password: "E2E#RateLimit1", name: "E2E RateLimit" },
  owner: { email: "e2e-owner@example.test", password: "E2E#OwnerPass12", name: "E2E Owner" },
};

async function main() {
  const cmd = process.argv[2];
  const emails = Object.values(E2E).map((u) => u.email);
  if (cmd === "setup") {
    await upsertCredentialUser({ ...E2E.super, role: "SUPER_ADMIN", mustChangePassword: true, createIfMissing: true });
    await upsertCredentialUser({ ...E2E.editor, role: "EDITOR", mustChangePassword: false, createIfMissing: true });
    await upsertCredentialUser({ ...E2E.victim, role: "EDITOR", mustChangePassword: false, createIfMissing: true });
    await upsertCredentialUser({ ...E2E.owner, role: "SUPER_ADMIN", mustChangePassword: false, createIfMissing: true });
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "login:" } } });
  } else if (cmd === "teardown") {
    // Fixture users plus any user the suite created (e2e-*@example.test).
    const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { email: { startsWith: "e2e-", endsWith: "@example.test" } }] }, select: { id: true } });
    const ids = users.map((u) => u.id);
    // Content created by the e2e suite: "E2E …" records and media uploaded by e2e users (with files).
    const media = await prisma.media.findMany({ where: { OR: [{ uploadedById: { in: ids } }, { alt: { startsWith: "E2E " } }] }, select: { id: true, storageKey: true, variants: true } });
    for (const m of media) {
      for (const k of new Set([m.storageKey, ...Object.values((m.variants as Record<string, string> | null) ?? {})])) await getStorage().delete(k).catch(() => undefined);
    }
    await prisma.media.deleteMany({ where: { id: { in: media.map((m) => m.id) } } });
    await prisma.artist.deleteMany({ where: { nameEn: { startsWith: "E2E " } } });
    await prisma.episode.deleteMany({ where: { titleEn: { startsWith: "E2E " } } });
    await prisma.video.deleteMany({ where: { titleEn: { startsWith: "E2E " } } });
    await prisma.album.deleteMany({ where: { titleEn: { startsWith: "E2E " } } });
    await prisma.newsPost.deleteMany({ where: { titleEn: { startsWith: "E2E " } } });
    await prisma.activityLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "login:" } } });
  } else throw new Error("usage: e2e-users.ts setup|teardown");
}

if (process.argv[1]?.endsWith("e2e-users.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

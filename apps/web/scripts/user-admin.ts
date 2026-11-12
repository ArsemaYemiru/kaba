import "../prisma/seed/load-env";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";

/**
 * Create or reset a credential user with Better Auth's own hasher.
 * Always revokes the user's sessions.
 */
export async function upsertCredentialUser(opts: {
  email: string;
  password: string;
  name?: string;
  role?: "SUPER_ADMIN" | "EDITOR";
  mustChangePassword: boolean;
  createIfMissing?: boolean;
}) {
  const ctx = await auth.$context;
  if (opts.password.length < ctx.password.config.minPasswordLength) throw new Error(`Password must be at least ${ctx.password.config.minPasswordLength} characters.`);
  const email = opts.email.toLowerCase();
  const hash = await ctx.password.hash(opts.password);
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    if (!opts.createIfMissing) throw new Error(`No user with email ${email}.`);
    user = await prisma.user.create({ data: { email, name: opts.name ?? email, role: opts.role ?? "EDITOR", emailVerified: true } });
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: opts.mustChangePassword, isActive: true, ...(opts.role ? { role: opts.role } : {}) },
    }),
    prisma.account.deleteMany({ where: { userId: user.id, providerId: "credential" } }),
    prisma.account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", password: hash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return user.id;
}

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { ac, ROLES } from "./auth-permissions";
import { prisma } from "./db";
import { getEnv } from "./env";

const env = getEnv();

export const PASSWORD_MIN_LENGTH = 12;

/**
 * Better Auth (spec §5). Sign-in goes through our own Server Action (with the
 * 5-per-15-min IP+email limit), so the public HTTP sign-in/sign-up endpoints
 * are disabled. Deactivated users can't create sessions.
 */
export const auth = betterAuth({
  appName: "Feta Show",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // only SUPER_ADMIN creates users
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    // No cookie cache: every admin request re-reads the session from the DB,
    // so role changes and deactivation apply immediately.
  },
  disabledPaths: ["/sign-in/email", "/sign-up/email", "/sign-in/social", "/sign-in/anonymous"],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
          if (!user?.isActive) return false; // deactivated: no new sessions
        },
        after: async (session) => {
          await prisma.user.update({ where: { id: session.userId }, data: { lastLoginAt: new Date() } });
        },
      },
    },
  },
  user: {
    additionalFields: {
      mustChangePassword: { type: "boolean", defaultValue: true, input: false },
      isActive: { type: "boolean", defaultValue: true, input: false },
      lastLoginAt: { type: "date", required: false, input: false },
    },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  plugins: [
    admin({ ac, roles: ROLES, defaultRole: "EDITOR", adminRoles: ["SUPER_ADMIN"] }),
    nextCookies(), // must stay last
  ],
});

export type Auth = typeof auth;

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, twoFactor } from "better-auth/plugins";
import { PASSWORD_MIN } from "./auth-constants";
import { ac, ROLES } from "./auth-permissions";
import { prisma } from "./db";
import { normalizeEmail } from "./email";
import { getEnv } from "./env";
import { sendCodeEmail } from "./mailer";

const env = getEnv();

export { PASSWORD_MIN };

export const OTP_TTL_SECONDS = 15 * 60;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Better Auth, staff only (A-77): there is no public sign-up. Super admins
 * create staff accounts in the admin (or the seed does); staff sign in with
 * email + password and optional TOTP two-factor. Email codes are used only
 * for staff password resets, which need SMTP (a super admin can also reset a
 * password from the Staff page).
 */
export const auth = betterAuth({
  appName: "Feta Awards",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Header/menu reads may use a 5-minute signed cookie; authorization always re-reads the DB.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
  // Better Auth's own limiter only guards the small HTTP surface (session reads); forms use lib/rate-limit (Postgres).
  rateLimit: { enabled: true, storage: "memory", window: 60, max: 100 },
  user: {
    additionalFields: {
      // Role is never accepted from the client (A-8).
      role: { type: "string", input: false, defaultValue: "EDITOR" },
      displayName: { type: "string", required: false },
      emailNormalized: { type: "string", input: false, required: false },
      isActive: { type: "boolean", input: false, defaultValue: true },
      lastLoginAt: { type: "date", input: false, required: false },
      mustChangePassword: { type: "boolean", input: false, defaultValue: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const emailNormalized = normalizeEmail(user.email);
          // Friendly error first; the unique index stops races (A-9).
          if (await prisma.user.findUnique({ where: { emailNormalized }, select: { id: true } }))
            throw new APIError("UNPROCESSABLE_ENTITY", { message: "An account already exists for this email.", code: "EMAIL_TAKEN" });
          return {
            data: {
              ...user,
              // Accounts are created only by a super admin or the seed; the role is set there.
              role: (user as { role?: string }).role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EDITOR",
              emailNormalized,
              displayName: ((user as { displayName?: string }).displayName || user.name).slice(0, 60),
              mustChangePassword: (user as { mustChangePassword?: boolean }).mustChangePassword ?? true,
              isActive: true,
            },
          };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const u = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
          if (!u?.isActive) return false;
        },
        after: async (session) => {
          await prisma.user.update({ where: { id: session.userId }, data: { lastLoginAt: new Date() } });
        },
      },
    },
  },
  plugins: [
    admin({ ac, roles: ROLES, defaultRole: "EDITOR", adminRoles: ["SUPER_ADMIN"], bannedUserMessage: "This account has been suspended." }),
    twoFactor({ issuer: "Feta Awards" }),
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_TTL_SECONDS,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      sendVerificationOnSignUp: false,
      disableSignUp: true, // email codes never create accounts
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 1 },
      async sendVerificationOTP({ email, otp, type }) {
        // Password-reset codes only. Never fail the request on mail trouble (SMTP is optional).
        await sendCodeEmail(email, otp, type).catch((err) => console.error(`[email-otp] couldn't send ${type} code`, err));
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;

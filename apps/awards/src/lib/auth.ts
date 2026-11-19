import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, captcha, emailOTP, phoneNumber, twoFactor } from "better-auth/plugins";
import { isDisposableEmail } from "disposable-email-domains-js";
import { MEMBER_PASSWORD_MIN } from "./auth-constants";
import { ac, ROLES } from "./auth-permissions";
import { prisma } from "./db";
import { normalizeEmail } from "./email";
import { getEnv } from "./env";
import { sendCodeEmail } from "./mailer";
import { smsProvider } from "./sms";

const env = getEnv();

export { MEMBER_PASSWORD_MIN };

export const OTP_TTL_SECONDS = 15 * 60;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Better Auth (spec §2/§5.1). Members sign up through our Server Actions
 * (Turnstile, consent, rate limits, then `auth.api`); the public HTTP surface
 * is reduced to what OAuth needs (A-45). Unverified members can sign in (A-5):
 * voting, not sign-in, requires a verified email.
 */
export const auth = betterAuth({
  appName: "Feta Awards",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MEMBER_PASSWORD_MIN,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        // Google returns a verified email, so Google accounts can vote straight away (spec §5.1).
        socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" as const } },
      }
    : {}),
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Header/menu reads may use a 5-minute signed cookie; authorization always re-reads the DB.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
  // Better Auth's own limiter only guards the small HTTP surface (OAuth, session reads); forms use lib/rate-limit (Postgres).
  rateLimit: { enabled: true, storage: "memory", window: 60, max: 100 },
  user: {
    additionalFields: {
      // Role is never accepted from the client (A-8).
      role: { type: "string", input: false, defaultValue: "MEMBER" },
      displayName: { type: "string", required: false },
      emailNormalized: { type: "string", input: false, required: false },
      newsOptIn: { type: "boolean", required: false, defaultValue: false },
      consentAt: { type: "date", input: false, required: false },
      isActive: { type: "boolean", input: false, defaultValue: true },
      lastLoginAt: { type: "date", input: false, required: false },
      mustChangePassword: { type: "boolean", input: false, defaultValue: false },
      isSample: { type: "boolean", input: false, defaultValue: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (isDisposableEmail(user.email)) throw new APIError("BAD_REQUEST", { message: "Disposable email addresses can't be used.", code: "DISPOSABLE_EMAIL" });
          const emailNormalized = normalizeEmail(user.email);
          // Friendly error first; the unique index stops races (A-9).
          if (await prisma.user.findUnique({ where: { emailNormalized }, select: { id: true } }))
            throw new APIError("UNPROCESSABLE_ENTITY", { message: "An account already exists for this email.", code: "EMAIL_TAKEN" });
          return {
            data: {
              ...user,
              role: "MEMBER", // public sign-up always creates a MEMBER; staff roles change only in the admin
              emailNormalized,
              displayName: ((user as { displayName?: string }).displayName || user.name).slice(0, 60),
              // Every sign-up path (form, Google) shows the rules + privacy consent before creating the account.
              consentAt: new Date(),
              isSample: false,
              mustChangePassword: false,
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
    admin({ ac, roles: ROLES, defaultRole: "MEMBER", adminRoles: ["SUPER_ADMIN"], bannedUserMessage: "This account has been suspended." }),
    twoFactor({ issuer: "Feta Awards" }),
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_TTL_SECONDS,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      // The sign-up action sends the first code itself (and starts the resend cooldown).
      sendVerificationOnSignUp: false,
      overrideDefaultEmailVerification: true,
      disableSignUp: true, // email codes never create accounts
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 1 }, // 60-second resend cooldown on the HTTP endpoint (actions enforce it too)
      async sendVerificationOTP({ email, otp, type }) {
        // Never fail the surrounding request (e.g. sign-up) on mail trouble; members can resend from /verify.
        await sendCodeEmail(email, otp, type).catch((err) => console.error(`[email-otp] couldn't send ${type} code`, err));
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      async sendOTP({ phoneNumber: to, code }) {
        await smsProvider().send(to, `Your Feta Awards code is ${code}. It expires in 5 minutes.`);
      },
    }),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: env.TURNSTILE_SECRET_KEY,
      // Backstop for the HTTP API; every route that can create a session or send a code.
      endpoints: ["/sign-up/email", "/sign-in/email", "/sign-in/email-otp", "/sign-in/phone-number", "/email-otp/send-verification-otp", "/email-otp/request-password-reset", "/forget-password/email-otp", "/phone-number/send-otp", "/request-password-reset"],
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;

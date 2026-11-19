import { z } from "zod";

/** Server environment, validated once on first use. Never import from client components. */
const mb = (fallback: number) => z.coerce.number().int().positive().default(fallback);
const secret = (name: string) => z.string().min(32, `${name} must be at least 32 characters`);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /**
     * The deployment, not the build mode: `next build`/`next start` always run
     * with NODE_ENV=production, even locally and in e2e. Safety rules that must
     * hold on the real site (no Turnstile bypass, real SMS) key off APP_ENV.
     */
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: secret("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3001"),
    APP_TIMEZONE: z.literal("Africa/Addis_Ababa").default("Africa/Addis_Ababa"),
    VOTE_HASH_SECRET: secret("VOTE_HASH_SECRET"),

    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(1026),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default("Feta Awards <no-reply@localhost>"),

    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().default("1x00000000000000000000AA"),
    TURNSTILE_SECRET_KEY: z.string().default("1x0000000000000000000000000000000AA"),
    TURNSTILE_BYPASS: z.enum(["0", "1"]).default("0"),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    SMS_PROVIDER: z.enum(["console", "custom"]).default("console"),
    /** Phone number + SMS code on the account page (spec §5.1 "switched on by env"). */
    ENABLE_PHONE_OTP: z.enum(["0", "1"]).default("0"),
    /** Origin the proxy uses to fetch the branded 404 from itself (A-39). */
    INTERNAL_ORIGIN: z.string().url().optional(),
    REDIS_URL: z.string().optional(),

    STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("storage"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),

    UPLOAD_MAX_IMAGE_MB: mb(10),
    UPLOAD_MAX_VIDEO_MB: mb(1024),
    ANALYTICS_PROVIDER: z.enum(["plausible", "umami", ""]).optional(),
    ANALYTICS_SITE_ID: z.string().optional(),
    /** Script URL (self-hosted Umami/Plausible); defaults to the provider's cloud script. */
    ANALYTICS_SCRIPT_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    // The load-test Turnstile bypass must never reach production (A-11).
    if (env.APP_ENV === "production" && env.TURNSTILE_BYPASS === "1") {
      ctx.addIssue({ code: "custom", path: ["TURNSTILE_BYPASS"], message: "TURNSTILE_BYPASS is not allowed in production" });
    }
    if (env.APP_ENV === "production" && env.ENABLE_PHONE_OTP === "1" && env.SMS_PROVIDER === "console") {
      ctx.addIssue({ code: "custom", path: ["SMS_PROVIDER"], message: "Phone OTP in production needs a real SMS provider (SMS_PROVIDER=custom)" });
    }
    if (env.STORAGE_DRIVER === "r2") {
      for (const key of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when STORAGE_DRIVER=r2` });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;
let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

/** Turnstile's documented always-pass test secret. */
export const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

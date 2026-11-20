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
     * hold on the real site (production checklist, rate limits) key off APP_ENV.
     */
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: secret("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3001"),
    APP_TIMEZONE: z.literal("Africa/Addis_Ababa").default("Africa/Addis_Ababa"),

    /** Optional: only staff password-reset codes are emailed (A-77). */
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(1026),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default("Feta Awards <no-reply@localhost>"),

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


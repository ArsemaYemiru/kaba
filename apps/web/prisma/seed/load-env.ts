import { config } from "dotenv";

// Imported first by seed.ts so env is loaded before any module reads it.
// Same precedence as Next.js: .env.local overrides .env.
config({ path: [".env.local", ".env"], quiet: true });

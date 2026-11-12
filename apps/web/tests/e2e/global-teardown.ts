import { config } from "dotenv";
import { Client } from "pg";

/** Remove submissions created by the e2e suite (names start with "E2E "). */
export default async function globalTeardown() {
  config({ path: [".env.local", ".env"], quiet: true });
  if (!process.env.DATABASE_URL) return;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(`DELETE FROM "Submission" WHERE "name" LIKE 'E2E %'`);
  } finally {
    await db.end();
  }
}

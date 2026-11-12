import { execFileSync } from "node:child_process";

/** Create the dedicated e2e admin users (see scripts/e2e-users.ts). */
export default function globalSetup() {
  execFileSync("pnpm", ["exec", "tsx", "scripts/e2e-users.ts", "setup"], { stdio: "inherit" });
}

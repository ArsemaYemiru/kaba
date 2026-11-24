import { test as setup } from "@playwright/test";
import { setupFixture } from "./fixture";

setup("create the e2e fixture content", async () => {
  await setupFixture();
});

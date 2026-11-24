import { test as teardown } from "@playwright/test";
import { teardownFixture } from "./fixture";

teardown("remove the e2e fixture content", async () => {
  await teardownFixture();
});

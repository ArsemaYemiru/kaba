import { getEnv } from "../env";
import { LocalStorage } from "./local";
import type { StorageDriver } from "./types";

export type { PresignedUpload, PutOptions, StorageDriver } from "./types";
export { IMMUTABLE } from "./types";

let driver: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const env = getEnv();
  if (env.STORAGE_DRIVER === "r2") {
    throw new Error("The R2 storage driver is added in Phase 5. Use STORAGE_DRIVER=local for now.");
  }
  driver = new LocalStorage(env.LOCAL_STORAGE_DIR);
  return driver;
}

export function getLocalStorage(): LocalStorage | null {
  const s = getStorage();
  return s instanceof LocalStorage ? s : null;
}

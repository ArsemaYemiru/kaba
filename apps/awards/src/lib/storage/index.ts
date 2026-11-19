import { getEnv } from "../env";
import { LocalStorage } from "./local";
import { R2Storage } from "./r2";
import type { StorageDriver } from "./types";

export type { CompletedPart, PresignedUpload, PutOptions, StorageDriver } from "./types";
export { IMMUTABLE } from "./types";

let driver: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const env = getEnv();
  driver =
    env.STORAGE_DRIVER === "r2"
      ? new R2Storage({
          accountId: env.R2_ACCOUNT_ID!,
          accessKeyId: env.R2_ACCESS_KEY_ID!,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
          bucket: env.R2_BUCKET!,
          publicUrl: env.R2_PUBLIC_URL!,
        })
      : new LocalStorage(env.LOCAL_STORAGE_DIR);
  return driver;
}

export function getLocalStorage(): LocalStorage | null {
  const s = getStorage();
  return s instanceof LocalStorage ? s : null;
}

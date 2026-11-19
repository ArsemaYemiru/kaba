import { getEnv } from "./env";

/** Pluggable SMS delivery (spec §5.1). `console` logs in dev; `custom` is where a real gateway is wired. */
export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

const consoleProvider: SmsProvider = {
  async send(to, message) {
    console.info(`[sms:console] to ${to}: ${message}`);
  },
};

const customProvider: SmsProvider = {
  async send() {
    throw new Error("SMS_PROVIDER=custom: implement the gateway call in src/lib/sms.ts before enabling phone OTP in production.");
  },
};

export function smsProvider(): SmsProvider {
  return getEnv().SMS_PROVIDER === "custom" ? customProvider : consoleProvider;
}

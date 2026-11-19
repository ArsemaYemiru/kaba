/** Reads verification codes from Mailpit (dev SMTP sink, docker-compose.awards.yml). */
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8026";

type Summary = { ID: string; Subject: string; Created: string; To: { Address: string }[] };

export async function latestCode(to: string, subject: RegExp, since: number, timeoutMs = 15_000): Promise<string> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=10`);
    const data = (await res.json()) as { messages?: Summary[] };
    const msg = (data.messages ?? []).find((m) => subject.test(m.Subject) && Date.parse(m.Created) >= since - 2000);
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { Text: string };
      const code = full.Text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`No "${subject}" email for ${to}`);
}

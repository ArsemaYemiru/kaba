/**
 * Normalized email for the one-inbox-one-account rule (spec §5.1, A-9):
 * lowercase + trim for everyone; Gmail/Googlemail also drop dots and "+tags"
 * and use the gmail.com domain.
 */
export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0]!.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

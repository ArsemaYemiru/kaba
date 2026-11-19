import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "./env";

/** SMTP via Nodemailer (spec §2): Mailpit in dev (localhost:1026, inbox UI on :8026). */
let transporter: Transporter | undefined;

function transport() {
  if (transporter) return transporter;
  const env = getEnv();
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
  });
  return transporter;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, dark, table-free email that renders in Gmail and mobile clients. */
function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#0A0A0C;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#F4F4F5">
<div style="max-width:480px;margin:0 auto;background:#141418;border:1px solid #26262B;border-radius:16px;padding:28px">
<p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#FFB800">ፈታ · FETA AWARDS</p>
<h1 style="margin:16px 0 12px;font-size:20px;color:#F4F4F5">${esc(title)}</h1>
${bodyHtml}
<p style="margin:28px 0 0;font-size:12px;color:#A1A1AA">If you didn't request this, you can ignore this email.</p>
</div></body></html>`;
}

const PURPOSE = {
  "email-verification": { subject: "Your Feta Awards verification code", title: "Verify your email", lead: "Enter this code to verify your email and unlock voting:" },
  "forget-password": { subject: "Your Feta Awards password reset code", title: "Reset your password", lead: "Enter this code to choose a new password:" },
  "sign-in": { subject: "Your Feta Awards sign-in code", title: "Sign in", lead: "Enter this code to sign in:" },
  "change-email": { subject: "Confirm your new Feta Awards email", title: "Confirm your email", lead: "Enter this code to confirm your new email:" },
} as const;

export async function sendCodeEmail(to: string, code: string, type: keyof typeof PURPOSE) {
  const p = PURPOSE[type];
  const html = layout(
    p.title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#D4D4D8">${esc(p.lead)}</p>
<p style="margin:0;font-size:34px;letter-spacing:10px;font-weight:800;color:#FFB800">${esc(code)}</p>
<p style="margin:16px 0 0;font-size:13px;color:#A1A1AA">The code expires in 15 minutes.</p>`,
  );
  await transport().sendMail({
    from: getEnv().MAIL_FROM,
    to,
    subject: p.subject,
    text: `${p.lead}\n\n${code}\n\nThe code expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    html,
  });
}

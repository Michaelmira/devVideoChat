import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { appUrl, env } from "@/lib/env";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { GMAIL, GMAIL_PASSWORD } = env();
  transporter =
    GMAIL && GMAIL_PASSWORD
      ? nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL, pass: GMAIL_PASSWORD } })
      : null;
  return transporter;
}

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#71717a">GuildMeet · <a href="${appUrl()}" style="color:#71717a">${appUrl().replace(/^https?:\/\//, "")}</a></p>
  </div></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    // No mail credentials (local dev): print so the flow can still be tested.
    console.info(`[email:dev] to=${to} subject="${subject}"\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")}`);
    return;
  }
  await t.sendMail({ from: `GuildMeet <${env().GMAIL}>`, to, subject, html });
}

export function sendVerificationCode(to: string, code: string) {
  return send(
    to,
    "Your GuildMeet verification code",
    layout(
      "Verify your email",
      `<p>Enter this code to finish creating your account:</p>
       <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${code}</p>
       <p style="color:#52525b">The code expires in 30 minutes. If you didn't sign up, ignore this email.</p>`,
    ),
  );
}

export function sendPasswordReset(to: string, link: string) {
  return send(
    to,
    "Reset your GuildMeet password",
    layout(
      "Reset your password",
      `<p>Someone asked to reset the password for this account.</p>
       <p style="margin:24px 0"><a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
       <p style="color:#52525b">The link expires in 1 hour. If this wasn't you, you can ignore this email.</p>`,
    ),
  );
}

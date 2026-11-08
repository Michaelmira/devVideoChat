import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";

export const VERIFICATION_TTL_MS = 30 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function resetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: sha256(token) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

import crypto from "node:crypto";

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");
  return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;
  const [scheme, iterationText, salt, expectedHash] = storedHash.split(":");
  const iterations = Number(iterationText);
  if (scheme !== "pbkdf2" || !iterations || !salt || !expectedHash) return false;

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString("base64url");
  const actual = Buffer.from(actualHash);
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

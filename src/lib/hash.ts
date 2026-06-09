import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Hashes a password using Node.js pbkdf2/scrypt.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const matchBuffer = scryptSync(password, salt, 64);
    return timingSafeEqual(keyBuffer, matchBuffer);
  } catch {
    return false;
  }
}

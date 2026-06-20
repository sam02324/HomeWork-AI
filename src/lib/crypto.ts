/**
 * AES-256-GCM helpers for encrypting secrets at rest (e.g. Google OAuth tokens).
 *
 * Key: TOKEN_ENCRYPTION_KEY — 64 hex characters (32 bytes).
 *   Generate with:  openssl rand -hex 32
 *
 * Wire format: "iv.authTag.ciphertext", each segment base64url-encoded.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96-bit nonce — the GCM standard
const TAG_LEN = 16; // 128-bit auth tag

/** Load and validate the 32-byte key. Throws if misconfigured. */
function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

const b64url = (buf: Buffer): string => buf.toString('base64url');

/**
 * Encrypt a UTF-8 string. Returns "iv.authTag.ciphertext" (base64url segments).
 * Throws if TOKEN_ENCRYPTION_KEY is missing/invalid — callers that persist
 * secrets must fail loudly rather than store plaintext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${b64url(iv)}.${b64url(tag)}.${b64url(ciphertext)}`;
}

/**
 * Decrypt a value produced by {@link encrypt}. Returns null on any failure
 * (wrong format, missing/wrong key, tampered ciphertext) so callers can fall
 * back to treating the input as legacy plaintext.
 */
export function decrypt(value: string): string | null {
  try {
    const key = getKey();
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return null;
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Transparent migration helper: try to decrypt; if the value isn't something
 * we produced (e.g. a pre-existing plaintext token), return it unchanged.
 */
export function decryptOrLegacy(value: string): string {
  return decrypt(value) ?? value;
}

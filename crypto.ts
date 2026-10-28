// Zero-knowledge crypto helpers built on the Web Crypto API.
// AES-GCM 256 for content, PBKDF2 (SHA-256, 600k iterations) for key derivation.
// The derived key never leaves the browser; only ciphertext + IVs are uploaded.

const SUBTLE = globalThis.crypto.subtle;
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM standard nonce
const VERIFIER_PLAINTEXT = "vault-verification-token";

export type VaultKey = {
  key: CryptoKey;
  salt: Uint8Array; // base64-sourced, 16 bytes
};

// --- base64 helpers (Uint8Array <-> base64 string) ---
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}

// --- key derivation ---
async function importPasswordKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return SUBTLE.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
}

export function generateSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

export async function deriveVaultKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(password);
  return SUBTLE.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// --- encryption / decryption of raw bytes ---
export type EncryptedBlob = {
  cipher: Uint8Array;
  iv: Uint8Array;
};

export async function encryptBytes(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_BYTES);
  const cipher = new Uint8Array(
    await SUBTLE.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext),
  );
  return { cipher, iv };
}

export async function decryptBytes(
  key: CryptoKey,
  cipher: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(
    await SUBTLE.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, cipher),
  );
}

// --- string helpers (for metadata like filenames / mime types) ---
export async function encryptString(
  key: CryptoKey,
  text: string,
): Promise<{ cipherB64: string; ivB64: string }> {
  const enc = new TextEncoder();
  const { cipher, iv } = await encryptBytes(key, enc.encode(text));
  return { cipherB64: bytesToBase64(cipher), ivB64: bytesToBase64(iv) };
}

export async function decryptString(
  key: CryptoKey,
  cipherB64: string,
  ivB64: string,
): Promise<string> {
  const dec = new TextDecoder();
  const bytes = await decryptBytes(key, base64ToBytes(cipherB64), base64ToBytes(ivB64));
  return dec.decode(bytes);
}

// --- verifier: prove the password unlocks the vault without storing it ---
export async function createVerifier(key: CryptoKey): Promise<{
  verifierCipher: string;
  verifierIv: string;
}> {
  const { cipherB64, ivB64 } = await encryptString(key, VERIFIER_PLAINTEXT);
  return { verifierCipher: cipherB64, verifierIv: ivB64 };
}

export async function verifyKey(
  key: CryptoKey,
  verifierCipher: string,
  verifierIv: string,
): Promise<boolean> {
  try {
    const decrypted = await decryptString(key, verifierCipher, verifierIv);
    return decrypted === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

export { bytesToBase64, base64ToBytes };

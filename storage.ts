import { supabase, STORAGE_BUCKET } from "./supabase";
import {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  decryptString,
  deriveVaultKey,
  encryptBytes,
  encryptString,
  generateSalt,
  createVerifier,
  verifyKey,
  type VaultKey,
} from "./crypto";

export type VaultMeta = {
  salt: string; // base64
  verifierCipher: string;
  verifierIv: string;
};

export type StoredFile = {
  id: string;
  // decrypted for display
  name: string;
  mime: string | null;
  size: number;
  cipherSize: number;
  createdAt: string;
  // server-side opaque fields
  storagePath: string;
};

// --- vault setup / unlock ---
export async function vaultExists(): Promise<boolean> {
  const { data, error } = await supabase
    .from("vault_metadata")
    .select("salt, verifier_cipher, verifier_iv")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function getVaultMeta(): Promise<VaultMeta | null> {
  const { data, error } = await supabase
    .from("vault_metadata")
    .select("salt, verifier_cipher, verifier_iv")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    salt: data.salt,
    verifierCipher: data.verifier_cipher,
    verifierIv: data.verifier_iv,
  };
}

export async function setupVault(password: string): Promise<VaultKey> {
  const salt = generateSalt();
  const key = await deriveVaultKey(password, salt);
  const { verifierCipher, verifierIv } = await createVerifier(key);

  const { error } = await supabase.from("vault_metadata").insert({
    salt: bytesToBase64(salt),
    verifier_cipher: verifierCipher,
    verifier_iv: verifierIv,
  });
  if (error) throw error;

  return { key, salt };
}

export async function unlockVault(password: string): Promise<VaultKey | null> {
  const meta = await getVaultMeta();
  if (!meta) return null;
  const saltBytes = base64ToBytes(meta.salt);
  const key = await deriveVaultKey(password, saltBytes);
  const ok = await verifyKey(key, meta.verifierCipher, meta.verifierIv);
  return ok ? { key, salt: saltBytes } : null;
}

type FileRow = {
  id: string;
  name_cipher: string;
  name_iv: string;
  mime_cipher: string | null;
  content_iv: string | null;
  size: number;
  cipher_size: number;
  storage_path: string;
  created_at: string;
};

// --- file listing (decrypt metadata client-side) ---
export async function listFiles(key: CryptoKey): Promise<StoredFile[]> {
  const { data, error } = await supabase
    .from("files")
    .select(
      "id, name_cipher, name_iv, mime_cipher, content_iv, size, cipher_size, storage_path, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data) return [];

  const files: StoredFile[] = [];
  for (const row of data as FileRow[]) {
    try {
      const name = await decryptString(key, row.name_cipher, row.name_iv);
      const mime = row.mime_cipher
        ? await decryptString(key, row.mime_cipher, row.name_iv)
        : null;
      files.push({
        id: row.id,
        name,
        mime,
        size: Number(row.size),
        cipherSize: Number(row.cipher_size),
        createdAt: row.created_at,
        storagePath: row.storage_path,
      });
    } catch {
      // skip rows that fail to decrypt (corrupted or wrong key)
    }
  }
  return files;
}

// --- upload: encrypt -> upload blob -> insert metadata ---
export async function uploadFile(key: CryptoKey, file: File): Promise<StoredFile> {
  const plain = new Uint8Array(await file.arrayBuffer());
  const { cipher, iv } = await encryptBytes(key, plain);
  const contentIvB64 = bytesToBase64(iv);

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("No authenticated user");
  const storagePath = `${userId}/${crypto.randomUUID()}`;

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, cipher, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  const nameEnc = await encryptString(key, file.name);
  const mimeEnc = file.type ? await encryptString(key, file.type) : null;

  const { data, error: insErr } = await supabase
    .from("files")
    .insert({
      name_cipher: nameEnc.cipherB64,
      name_iv: nameEnc.ivB64,
      mime_cipher: mimeEnc?.cipherB64 ?? null,
      content_iv: contentIvB64,
      size: file.size,
      cipher_size: cipher.length,
      storage_path: storagePath,
    })
    .select("id, created_at")
    .single();
  if (insErr) {
    // best-effort cleanup of orphaned blob
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw insErr;
  }

  return {
    id: data.id,
    name: file.name,
    mime: file.type || null,
    size: file.size,
    cipherSize: cipher.length,
    createdAt: data.created_at,
    storagePath,
  };
}

// --- download: fetch blob -> decrypt -> return Blob ---
export async function downloadFile(key: CryptoKey, f: StoredFile): Promise<Blob> {
  const { data: row, error: rowErr } = await supabase
    .from("files")
    .select("content_iv")
    .eq("id", f.id)
    .maybeSingle();
  if (rowErr || !row || !row.content_iv)
    throw rowErr ?? new Error("File metadata missing");

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(f.storagePath);
  if (error) throw error;
  const cipher = new Uint8Array(await data.arrayBuffer());
  const iv = base64ToBytes(row.content_iv);
  const plain = await decryptBytes(key, cipher, iv);
  return new Blob([plain], { type: f.mime ?? "application/octet-stream" });
}

export async function deleteFile(f: StoredFile): Promise<void> {
  const { error: delErr } = await supabase
    .from("files")
    .delete()
    .eq("id", f.id);
  if (delErr) throw delErr;
  const { error: stoErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([f.storagePath]);
  if (stoErr) throw stoErr;
}

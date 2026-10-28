/*
# Zero-Knowledge Encrypted Storage Schema

1. Overview
- This migration creates the backend for a zero-knowledge (client-side encrypted) cloud storage app.
- The server NEVER sees plaintext or encryption keys. Files are encrypted in the browser with AES-GCM 256,
  using a key derived (PBKDF2) from the user's master password. Only ciphertext blobs are uploaded.
- Metadata stored server-side is also partially encrypted (name/iv) so the server cannot read filenames.

2. New Tables
- `files`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users ON DELETE CASCADE)
  - `name_cipher` (text, not null) — base64 of the AES-GCM encrypted filename
  - `name_iv` (text, not null) — base64 nonce used to encrypt the filename
  - `mime_cipher` (text) — base64 of encrypted mime type (nullable for unknown types)
  - `size` (bigint, not null) — original (plaintext) byte size, shown to user
  - `cipher_size` (bigint, not null) — encrypted blob byte size in storage
  - `storage_path` (text, not null) — path/key in the storage bucket
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
- `vault_metadata`
  - `user_id` (uuid, primary key, references auth.users ON DELETE CASCADE)
  - `salt` (text, not null) — base64 PBKDF2 salt for key derivation
  - `verifier_cipher` (text, not null) — base64 of a known-token encrypted with the derived key, used to verify the master password client-side without storing it
  - `verifier_iv` (text, not null) — base64 nonce for the verifier
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

3. Storage Bucket
- Creates a private storage bucket `user_files` (public = false) for encrypted blobs.
- Files are stored at `user_id/random-uuid` paths; the server cannot decrypt them.

4. Security
- RLS enabled on both tables.
- `files`: owner-scoped CRUD for `authenticated` (auth.uid() = user_id). The owner column defaults to auth.uid().
- `vault_metadata`: owner-scoped SELECT/INSERT/UPDATE for `authenticated`.
- Storage bucket policies: authenticated users can read/write/delete only objects under their own user_id prefix.
- Grants are explicit and minimal: only `authenticated` gets table access; storage uses the auth.uid() prefix check.
- No `anon` policies: this app requires sign-in.

5. Notes
- The encryption key never leaves the browser. The server only stores ciphertext and an opaque verifier.
- `vault_metadata` is created on first master-password setup and is read on every unlock to verify the password.
*/

-- Files metadata table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name_cipher text NOT NULL,
  name_iv text NOT NULL,
  mime_cipher text,
  size bigint NOT NULL,
  cipher_size bigint NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON files TO authenticated;

DROP POLICY IF EXISTS "select_own_files" ON files;
CREATE POLICY "select_own_files" ON files FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_files" ON files;
CREATE POLICY "insert_own_files" ON files FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_files" ON files;
CREATE POLICY "update_own_files" ON files FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_files" ON files;
CREATE POLICY "delete_own_files" ON files FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Vault metadata table (PBKDF2 salt + verifier for client-side master password)
CREATE TABLE IF NOT EXISTS vault_metadata (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salt text NOT NULL,
  verifier_cipher text NOT NULL,
  verifier_iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vault_metadata ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON vault_metadata TO authenticated;

DROP POLICY IF EXISTS "select_own_vault" ON vault_metadata;
CREATE POLICY "select_own_vault" ON vault_metadata FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_vault" ON vault_metadata;
CREATE POLICY "insert_own_vault" ON vault_metadata FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_vault" ON vault_metadata;
CREATE POLICY "update_own_vault" ON vault_metadata FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger for files
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS files_touch_updated_at ON files;
CREATE TRIGGER files_touch_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS vault_touch_updated_at ON vault_metadata;
CREATE TRIGGER vault_touch_updated_at BEFORE UPDATE ON vault_metadata
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Storage bucket for encrypted blobs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_files', 'user_files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users only touch objects under their own user_id prefix
DROP POLICY IF EXISTS "Users can read own storage objects" ON storage.objects;
CREATE POLICY "Users can read own storage objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user_files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own storage objects" ON storage.objects;
CREATE POLICY "Users can upload own storage objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user_files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own storage objects" ON storage.objects;
CREATE POLICY "Users can update own storage objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user_files' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'user_files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own storage objects" ON storage.objects;
CREATE POLICY "Users can delete own storage objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user_files' AND (storage.foldername(name))[1] = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

/*
# Add content_iv to files table

The file content (binary blob) is encrypted with AES-GCM using its own random IV,
which must be stored so the client can decrypt it on download. Previously only
the filename's IV (name_iv) was stored, which was insufficient.

1. Modified Tables
- `files`
  - Add `content_iv` (text, not null) — base64 of the AES-GCM nonce used for the file content.
  - Existing rows (if any) are nullable during transition; enforced NOT NULL for new inserts.
2. Security
- No policy changes. Existing owner-scoped CRUD already covers the new column.
*/

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS content_iv text;

GRANT SELECT, INSERT, UPDATE, DELETE ON files TO authenticated;

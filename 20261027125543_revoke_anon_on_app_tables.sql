/*
# Revoke anon privileges on files and vault_metadata

The app requires sign-in, so the anon role must not have any grants on the
data tables. Earlier migrations granted only to `authenticated`, but the
default schema privileges left anon with broad access. This migration revokes
all privileges from `anon` on both tables so only authenticated sessions can
reach them. Storage object grants are left as-is (already authenticated-only
via policies, and the bucket is private).

1. Security changes
- REVOKE SELECT, INSERT, UPDATE, DELETE ON files FROM anon.
- REVOKE SELECT, INSERT, UPDATE, DELETE ON vault_metadata FROM anon.
2. No data changes, no policy changes.
*/

REVOKE SELECT, INSERT, UPDATE, DELETE ON files FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON vault_metadata FROM anon;

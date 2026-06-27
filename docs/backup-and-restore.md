# Backup and Restore

Seine Studio backups are full JSON bundles intended for disaster recovery, not ordinary reporting. Each bundle contains all 16 application tables, a schema fingerprint, row counts, and a SHA-256 checksum for every table. Files contain private client and business data; keep them in encrypted storage and never commit them.

## Backup cadence

- Run a backup weekly while the app is in light use.
- Run one immediately before a schema migration or bulk import.
- Keep the latest four weekly backups in an owner-controlled encrypted folder or drive.
- Once per quarter, complete the restore test below and record the date and result.
- Neon point-in-time restore is useful, but does not replace a portable export controlled by Seine Studio.

## Create a backup

Use the production database connection only for the read-only backup command:

```sh
export DATABASE_URL='postgresql://...'
npm run db:backup
```

The command creates a permission-restricted file under `backups/`. Set `BACKUP_DIR` to write directly to an owner-controlled encrypted location.

## Restore test

Never test a restore against production. Create a fresh temporary Neon branch or empty PostgreSQL database, apply the repository migrations, then restore using its connection string:

```sh
export RESTORE_DATABASE_URL='postgresql://...temporary-branch...'
npm run db:restore -- backups/seine-studio-YYYY-MM-DDTHH-MM-SSZ.json
```

The restore command verifies the manifest and checksums, requires an exact schema match, refuses any target containing application rows, restores in one transaction, and reads every table back to verify it. A successful run ends with `Restore verified`.

After the test, spot-check a client, project, inventory lot and movement, pricing version, and reply template in the temporary branch. Record the backup filename, test date, operator, row total, and result. Delete the temporary branch after verification.

## Recovery procedure

1. Stop application writes or switch the Cloudflare deployment to a maintenance page.
2. Preserve the affected database and create a new empty recovery branch.
3. Apply the exact repository migration version used by the backup.
4. Run the guarded restore command against the recovery branch.
5. Verify representative records and totals before changing `DATABASE_URL`.
6. Point Cloudflare to the verified recovery branch, test sign-in, and resume writes.

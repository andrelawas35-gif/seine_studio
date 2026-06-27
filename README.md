# Seine Studio Operations

Private, mobile-first operations software for Seine Studio. The PWA tracks clients, jewelry, custom work, pricing, inventory, finances, replies, and event planning for the owner and developer.

Requires Node.js 22 or newer.

## Running the frontend

```sh
npm install
npm run dev
```

This local workflow uses the existing fixtures. Phase 1 backend provisioning and migration instructions are in [docs/phase-1-backend-setup.md](docs/phase-1-backend-setup.md).

Portable database backup cadence and the guarded restore test are documented in [docs/backup-and-restore.md](docs/backup-and-restore.md).

## Quality checks

```sh
npm run check
```

# Guardrails — Common Errors (mandatory reference for every phase)

Distilled from [`docs/post-deployment-fixes.md`](../post-deployment-fixes.md). These are
**real failures that already shipped to production** on Seine Studio. Every agent
context pack references this file. Before opening a PR, self-check against the
categories that touch your task.

> **Why this exists:** most of these compile clean with `tsc` and only fail at runtime
> in the deployed Cloudflare Worker, or only on a real iOS device. Local "it works"
> does not clear them.

---

## G1 — Drizzle + Cloudflare Workers bundler bug (the #1 recurring outage)

**Rule:** **Never** use `db.select({ specific: cols })` combined with `.leftJoin()` /
`.innerJoin()` in any `functions/api/**` handler. The Workers bundler triggers
`orderSelectedFields → Object.entries(undefined)` → `TypeError: Cannot convert
undefined or null to object` **at runtime only** (TS compiles clean).

```ts
// ❌ NEVER — breaks in the deployed worker
const [r] = await db.select({ id: a.id, name: b.name })
  .from(a).leftJoin(b, eq(a.bId, b.id));

// ✅ ALWAYS — select all, flatten manually
const rows = await db.select().from(a).leftJoin(b, eq(a.bId, b.id));
const records = rows.map((r) => ({ id: r.a.id, name: r.b?.name ?? null }));
```

- The flattened row is keyed by **table name** (`r.a`, `r.b`), and joined sides are
  **nullable** — always `r.b?.col ?? null`.
- This bites **activity-log and revision queries** joining `appUsers`/`clients` most
  often — they're easy to miss in a sweep. Two separate fix waves were needed because
  the first missed them.
- **`groupBy` + join** produces invalid SQL (`SELECT * GROUP BY …`). Split into
  separate simple queries and combine in JS.
- After editing any endpoint, grep the file for `db.select({` followed by `.join` and
  confirm zero matches.

## G2 — API endpoint correctness (scoping, filters, prefixes)

- **A list filter must actually scope the records.** The Events finance tab once fetched
  *every* invoice (`/api/invoices?limit=200`) and summed studio-wide. If you add a
  filter param (`?eventId=`, `?clientId=`, `?status=`), the handler must apply it in the
  `where`, and the caller must pass it. Verify the returned set is scoped, not global.
- **Filter through the correct relationship.** Invoices reach an event via
  `invoices.event_id` (direct column, Wave 0 M0.4) — not through `projects.event_id`.
  Use the direct column; don't reintroduce the through-project join.
- **No double `/api` prefix.** Path bugs (the "API double-prefix" fix) come from mixing
  `apiRequest("/api/...")` with a base that already includes `/api`. Match the existing
  call convention in the file you're editing (`apiRequest("/projects")` vs
  `apiRequest("/api/invoices")` — they differ by endpoint; copy the neighbor).
- **Never reference a column that isn't on the schema.** `quotes.totalCents` did not
  exist and shipped a 500. Check `src/server/db/schema.ts` before naming a column.

## G3 — Zod input transforms & PATCH bodies

- **Don't coerce `undefined → null` for `.notNull()` columns.** `input.clientId ?? null`
  in an update transform made PATCH set a NOT NULL column to null → DB reject. Pass
  `undefined` **through** when a field isn't provided so it's omitted from the update.
- **Accept empty strings where the form can send them.** `clientId: ""` failed UUID
  validation; mirror the working pattern `.nullable().or(z.literal(""))`.
- **Frontend PATCH must send a clean object** — only changed/valid fields. Spreading the
  whole form (`projectNumber: ""`, `catalogPieceId: ""`, …) into the body caused
  validation 500s. Strip `undefined`/empty keys and fields the endpoint doesn't accept.
- **Respect CHECK constraints.** `projects_owner_xor` requires a client *or* an event;
  clearing both violates it. Know the constraint before you let a field be cleared.

## G4 — JSONB in the Workers runtime

- Raw Drizzle `Date` objects written into a JSONB column (e.g. activity `before`/`after`)
  fail to serialize in the Workers environment. Wrap with
  `JSON.parse(JSON.stringify(value))` before storing.

## G5 — CSS variables & theming (transparent-modal class of bugs)

- **Inline styles cannot resolve CSS custom properties.**
  `style={{ background: "var(--canvas)" }}` renders **transparent**. Use Tailwind
  classes (`bg-card`, `text-muted-foreground`, `text-accent`) instead.
- **Use real token names.** `--ink-muted` does not exist → it's `--muted-foreground`.
  `--canvas` as a background → use `bg-card` / surface tokens. Check the token exists.
- **Backdrops:** `rgba(23,20,15,0.45)` + `backdropFilter: blur(4px)` — not `bg-black/30`.
  Zero `bg-black/` backdrops should remain.

## G6 — React state staleness (critical for Phase 0's state-lifting work)

- **`useState(initialFromProps)` only reads its initial value once.** After data reloads
  (e.g. a save re-fetches detail), state derived from props goes **stale and
  unresponsive** — this is exactly the "pricing panel editable only once" bug, fixed
  with `key={detail.versions?.length}` to force a clean remount.
- When **lifting selection/filter state into the URL** (F0.1/F0.2), the detail/data
  effect must re-run on the param change. Key effects on the route value
  (`useParams`/`useSearchParams`), not on a snapshot copied into `useState`. If a child
  initializes from a prop snapshot, give it a `key` that changes when the snapshot does.

## G7 — Data mode (fixtures vs API) & resilient fetching

- **Production runs `VITE_DATA_MODE=api`.** Components that compute off `INITIAL_*`
  arrays (empty in `data.ts`) render permanently blank in production. Fetch live records
  with explicit loading/error states; gate on `USE_DATABASE`/`import.meta.env`.
- **Don't read fixture-only fields off API records.** `project.price`, `downpaid`,
  `totalSpent` don't exist on `ProjectRecord`/`ClientRecord` — money is derived
  server-side (`finance: { … }` blocks). Use the derived block, never a duplicated field.
- **Non-core dashboard sources use `Promise.allSettled`** so one failed fetch never
  blanks the whole screen (the Overview pattern).

## G8 — Mobile / iOS / PWA

- **Inputs must be ≥16px font** or iOS Safari auto-zooms (viewport meta currently guards
  this; don't reintroduce sub-16px inputs that re-trigger it).
- **Respect safe-area insets** (`env(safe-area-inset-top/bottom)`); use `h-screen`, not
  `h-dvh`. Keep the primary action above the on-screen keyboard.
- **Type floor 11px** — no `text-[9px]`/`text-[10px]`; eyebrow floor is 11px (8px only
  for bottom-nav labels).
- **Use the `<Modal>` component**, never a custom `fixed inset-0` overlay — you lose
  focus trap, Escape, body-scroll-lock, and the scrollable-body/pinned-footer behavior.

## G9 — Auth & environment (rarely touched, high blast radius)

- **Two Neon Auth URLs, both ending `/neondb/auth`** (client via the same-origin
  `/neon-auth` proxy; server secret `NEON_AUTH_URL`). The proxy
  (`functions/neon-auth/[[path]].ts`) keeps the cookie first-party for iOS PWA. Do not
  point `VITE_NEON_AUTH_URL` directly at the Neon host. JWT `iss`/`aud` validate against
  `new URL(authUrl).origin`, JWKS against the subpath. Don't "simplify" this.
- Never expose `DATABASE_URL` or any non-`VITE_` secret to the client.

---

## Pre-PR checklist (every task)

- [ ] No `db.select({…}).join()` in touched `functions/api/**` files (G1)
- [ ] New/changed endpoints scope their filters correctly; columns exist on the schema (G2)
- [ ] PATCH transforms pass `undefined` through; bodies are clean; CHECK constraints respected (G3)
- [ ] JSONB writes serialized via `JSON.parse(JSON.stringify())` (G4)
- [ ] No inline `var(--…)`; real token names; correct backdrop (G5)
- [ ] No stale `useState(fromProps)`; effects re-run on URL/param change; `key` where needed (G6)
- [ ] Works in `VITE_DATA_MODE=api`; no fixture-only fields; `allSettled` for non-core (G7)
- [ ] ≥16px inputs, safe-area, 11px floor, `<Modal>` used (G8)
- [ ] `tsc` clean **and** verified against the deployed worker / real device when relevant

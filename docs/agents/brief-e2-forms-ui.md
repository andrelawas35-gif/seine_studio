# E2 — Forms & UI Polish Engineer

## Files owned (exclusive — no one else edits these)

| File | Purpose |
|------|---------|
| `src/app/components/CertificatesPage.tsx` | Certificate list + create/edit modal |
| `src/app/components/RepairsPage.tsx` | Repair ticket list + create/edit modal |
| `src/app/components/Modal.tsx` | Shared modal primitive |

## Required reading (before touching code)

1. `CLAUDE.md` — design system (French Minimal, type scale, interaction rules)
2. `CONTEXT.md` — domain glossary
3. `docs/adr/0001-phase-2-ui-foundation.md` — type-scale floor, primitives
4. `docs/post-deployment-fixes.md` — existing UI fixes section
5. `docs/agents/domain.md` — how to consume domain docs

## Wave 1 Tasks

### 1. Make certificate modal form scrollable

- **File:** `src/app/components/CertificatesPage.tsx`
- Scrollable body area, fixed header (title + close button), fixed footer (action buttons).
- Cap `max-height` so the modal doesn't exceed the viewport.
- Verify on a mobile viewport (375px wide, keyboard open).

### 2. Make repair modal form scrollable

- **File:** `src/app/components/RepairsPage.tsx`
- Same treatment: scrollable body, fixed header/actions, capped max-height.
- Both modals should feel consistent — use the same scroll pattern.

### 3. Verify Modal.tsx primitive

- **File:** `src/app/components/Modal.tsx`
- Ensure the shared modal supports the scrollable pattern (may need a `scrollable` prop or just document the pattern for future use).
- If the existing Modal doesn't support fixed header/footer, extend it minimally.

## Design constraints (from CLAUDE.md)
- Touch-first: 44×44px minimum touch targets
- Type scale floor: 11px (eyebrow), 12px (caption), 14px (body)
- Mobile is first-class — test on phone viewport
- Respect `prefers-reduced-motion`

## Acceptance criteria
- Certificate create/edit modal scrolls with fixed header + actions on mobile
- Repair create/edit modal scrolls with fixed header + actions on mobile
- Modals don't overflow the viewport when keyboard is open on iOS
- Consistent pattern between both modals

## Merge constraints
- E2 is fully parallel with E1, E3 (Wave 1 slice), and E9 — disjoint files
- No dependencies on any other engineer

# Jewelry Atelier Operations Platform

## Project Purpose

Build a focused operations dashboard for an independent fine-jewelry brand based in Manila. The product may take functional inspiration from Gem Logic, but it must be intentionally scaled for a founder-led starter brand rather than copied as an enterprise jewelry-management suite.

The platform should give the owner one calm, reliable place to manage pieces, clients, commissions, payments, expenses, certificates, repairs, and business performance. It is an internal business application first. A public storefront or marketing website is outside the initial scope unless added later as a separate product surface.

The working brand name in the prototype, `GemLogic Atelier`, is placeholder copy. Future agents must keep brand identity configurable and must not present the product as affiliated with Gem Logic.

## Product Principles

1. **Curated, not crammed.** Show the decision or task that matters now. Progressive disclosure is preferable to dense all-in-one screens.
2. **Jewelry-native records.** Metal, karat, stone, dimensions, provenance, labor, and material allocation are first-class fields, not notes attached to generic products.
3. **One connected history.** A client, project, quote, invoice, payment, piece, certificate, repair, and expense should link to each other where applicable.
4. **Starter-brand practicality.** Prioritize reliable workflows, searchable records, document generation, and clear finances before advanced automation.
5. **Trust through traceability.** Important changes, payments, handoffs, and status transitions should be dated and attributable.
6. **Manila by default.** Use Philippine pesos, Philippine contact and address conventions, and `Asia/Manila` for stored/displayed business dates unless a user explicitly changes them.
7. **Calculated truth.** Revenue, balances, inventory value, cost, margin, and profit should be derived from source records rather than manually duplicated.

## Design Rationale

The permanent visual direction is **French Minimal / Louvre-inspired**.

The Louvre aesthetic is not decorative maximalism. Its architecture is grand: clean stone, precise grids, glass pyramids. Richness comes from proportion and material, not ornament.

For this dashboard, that means:

- Generous whitespace and strong, measured proportions.
- Serif display typography paired with a neutral sans serif for utility text.
- A cream or warm off-white canvas, never a cold gray application shell.
- Hairline borders, disciplined alignment, and shallow radii.
- Gold as a single, sparing accent, like a museum label beside a display case.
- Dark charcoal for structural anchors such as navigation and primary actions.
- Data that feels curated. Each panel is a display case, not a storage bin.

These principles are constraints, not a temporary theme. New features must inherit them.

### Existing Visual Foundation

The prototype already establishes a useful starting palette and type system:

- Canvas: `#F0EBE0`
- Surface: `#FAF7F0`
- Primary ink/sidebar: `#17140F`
- Gold accent: `#B8975A`
- Muted ink: `#7A6F5E`
- Display type: Playfair Display
- Interface type: DM Sans
- Numeric/identifier type: DM Mono
- Base radius: `0.25rem`

Prefer semantic design tokens over repeating hex values in components. Status colors may use restrained red, amber, green, blue, or violet where meaning requires them; gold must not become a general-purpose status color.

### Interaction Rules

- Use one clear primary action per page or major section.
- Prefer descriptive labels such as `Create quote` or `Log expense` over a context-free `New` button.
- Keep tables calm: concise columns, aligned currency, lightweight dividers, and optional detail drawers or pages.
- Do not rely on hover for essential actions; touch and keyboard users need visible access.
- Every form needs labels, validation, useful empty states, and an explicit success or error result.
- Preserve visible focus states and semantic HTML. Color alone must not communicate status.
- Desktop is the main working environment, but all core workflows must remain usable on tablet and mobile.
- Respect reduced-motion preferences. Motion should clarify state, never decorate routine work.

## Primary User

The initial user is the owner-operator of an independent Manila jewelry brand who manages design, client communication, sourcing, production oversight, and finances. The architecture should permit staff roles later, but the MVP does not need enterprise permissions.

Future roles may include owner/admin, studio staff, sales/client service, maker, and accountant. Sensitive cost, margin, and client data should eventually be permission-aware.

## Core Information Architecture

1. **Overview** - priorities, deadlines, low stock, financial snapshot, and recent activity.
2. **Projects** - custom commissions and collection development from inquiry through completion.
3. **Catalog & Inventory** - finished pieces, raw materials, stones, findings, stock movements, and locations.
4. **Clients** - contact details, preferences, important dates, communication notes, and full transaction history.
5. **Sales** - quotes, invoices, payments, deposits, balances, and document delivery.
6. **Expenses** - material purchases and operating expenses, linked to suppliers, inventory, and projects when relevant.
7. **Documents** - certificates of authenticity and generated business documents.
8. **Repairs** - intake, condition, custody, work, deadlines, charges, and release.
9. **Reports** - revenue, receivables, pipeline, margins, expenses, and profit and loss.

Social-media planning exists in the current prototype but is not a core operational requirement. Keep it only after the jewelry and financial workflows are complete, or move it to a later optional module.

## Functional Scope

### 1. Product Catalog and Inventory

Support two related but distinct concepts:

- **Catalog pieces:** sellable designs or one-off finished pieces with SKU, title, collection, category, photos, description, retail price, status, and location.
- **Inventory items:** raw metals, stones, pearls, findings, packaging, and finished stock with quantities, units, cost basis, reorder level, supplier, and location.

Jewelry-specific details should include metal, karat/fineness, weight, stone species, variety, shape/cut, dimensions, carat weight, color, clarity/grade where relevant, treatment/disclosure, setting, size, serial or lot number, and provenance notes.

Required behavior:

- Record stock in, stock out, adjustment, reservation, consumption, return, and transfer movements.
- Keep an immutable stock-movement history; do not update quantity without recording why.
- Allocate materials and labor to a project or finished piece to calculate cost of goods sold.
- Flag low and out-of-stock items from configurable reorder thresholds.
- Track workshop, showroom, consignment, client custody, and other locations.
- Never use JavaScript floating-point values as the authoritative representation of money or precious-material precision in a production backend.

### 2. CRM

Each client profile should hold:

- Name, preferred name/pronouns if supplied, email, Philippine/international phone, and address.
- Jewelry preferences: metals, karats, stones, sizes, style, budget range, and dislikes.
- Important dates and follow-up reminders.
- Source/referrer and consent-aware communication preferences.
- Notes and a chronological activity timeline.
- Linked inquiries, projects, quotes, invoices, payments, certificates, purchases, and repairs.

The system should derive lifetime value and purchase history from transactions. Do not ask users to maintain a separate `totalSpent` field manually.

### 3. Custom Creations

Track commissions and collection pieces through an explicit workflow:

`Inquiry -> Consultation -> Quote -> Deposit Pending -> Design -> Client Approval -> Sourcing -> Production -> Quality Check -> Balance Due -> Ready for Delivery -> Delivered -> Closed`

Cancelled and on-hold are side states, not successful completion states. Payment status must remain separate from production status.

Each project should support the client, target date, budget, design brief, references/sketches, measurements, revision/approval history, material allocations, maker/supplier, milestones, costs, quote, invoice, payments, certificate, delivery method, and internal notes.

### 4. Quotes

- Draft itemized estimates with material, labor, stone, service, discount, tax/fee, and total lines.
- Set an expiry date, deposit amount or percentage, terms, and revision number.
- Use statuses: `Draft`, `Sent`, `Viewed`, `Accepted`, `Declined`, `Expired`, and `Converted`.
- Record acceptance and convert an accepted quote into a project and/or invoice without retyping data.
- Prepare for a secure public acceptance and pay-by-link flow; provider selection is a later technical decision.

### 5. Invoices and Payments

- Generate professional, branded invoices with stable document numbers and PDF output.
- Use invoice statuses such as `Draft`, `Sent`, `Partially Paid`, `Paid`, `Overdue`, `Void`, and `Refunded`.
- Record multiple payments against one invoice, including deposits and final balances.
- Store payment date, amount, method, external reference, fees, and notes.
- Support Philippine-friendly methods such as bank transfer, cash, card/payment link, GCash, and Maya without hard-coding a provider into the domain model.
- Calculate balance due from invoice totals, credits, refunds, and payment records.
- Never delete finalized financial records; void or reverse them with an audit trail.

### 6. Expenses

- Track date, supplier, category, description, amount, payment method, receipt, tax treatment, and notes.
- Link a material purchase to an inventory receipt and optionally link expenses to projects.
- Separate direct costs/COGS from operating expenses so margin and P&L remain meaningful.
- Prevent the same purchase from being counted once as inventory cost and again as an unrelated project cost.

### 7. Certificates of Authenticity

- Generate a branded, printable certificate with a unique certificate number and verification code or URL.
- Include piece/SKU, owner where appropriate, completion or sale date, metal and fineness, weight, stone specifications and disclosures, maker/brand, care guidance, and authorized signature.
- Preserve a snapshot of issued certificate data so later catalog edits do not silently alter an issued document.
- Support reissue history and revocation; certificates should not be hard-deleted.

### 8. Repair and Alteration Tickets

- Create a unique intake ticket and printable/client receipt.
- Record client, piece description, photos, identifying marks, received condition, included accessories/stones, requested work, estimate, deposit, promised date, and custody location.
- Use statuses: `Received`, `Assessed`, `Awaiting Approval`, `In Service`, `Waiting for Parts`, `Quality Check`, `Ready`, `Released`, and `Cancelled`.
- Record every custody handoff, approval, change in scope, charge, and release acknowledgment.
- Surface overdue tickets and upcoming promises on Overview.

### 9. Reporting and Financial Overview

The overview should answer, at a glance:

- How much revenue was collected in the selected period?
- What is outstanding and overdue?
- What is the weighted and unweighted sales pipeline?
- What are gross sales, COGS, gross profit, operating expenses, and net profit?
- Which pieces, categories, metals, stones, and clients drive sales?
- Which commissions are late or blocked?
- Which inventory needs attention?

Reports must use selectable date ranges and clearly distinguish cash collected from invoiced revenue. Margin should be calculated from transaction-linked costs. P&L should initially be an internal management view, not presented as tax or statutory accounting advice.

## Domain Model

Use stable internal IDs and human-readable document numbers separately. The minimum connected entities are:

- `User`, `Brand`, `Location`, `Client`, `ClientPreference`, `Activity`
- `CatalogPiece`, `Material`, `Stone`, `InventoryLot`, `StockMovement`, `Supplier`
- `Project`, `ProjectMilestone`, `DesignRevision`, `Approval`, `MaterialAllocation`
- `Quote`, `QuoteVersion`, `QuoteLineItem`
- `Invoice`, `InvoiceLineItem`, `Payment`, `Refund`
- `Expense`, `ExpenseCategory`, `Attachment`
- `Certificate`, `CertificateRevision`
- `RepairTicket`, `RepairEvent`, `CustodyEvent`

Important relationships:

- A client can have many projects, transactions, certificates, and repair tickets.
- A project may originate from one accepted quote and may have multiple invoices and payments.
- An inventory lot can contribute to multiple pieces or projects through stock movements and allocations.
- A finished piece can have one active certificate with an immutable issuance history.
- A repair ticket may link to an existing piece, but must also support unregistered client-owned jewelry.

## MVP and Delivery Plan

### Phase 0 - Stabilize the Prototype

- Make `src/app/data.ts` the single source for shared domain types and fixture data.
- Remove duplicated types, constants, helpers, and mock records from `src/app/App.tsx`.
- Split the 1,000-line application and 984-line accounting component into feature modules with a shared app shell.
- Add Accounting to the active navigation and connect it to shared state.
- Replace ambiguous global actions with page-specific actions.
- Add routing or stable URL state so pages and records are linkable.
- Add linting, formatting, type checking, and a test command.
- Preserve the current visual direction while migrating repeated literal colors into tokens.

### Phase 1 - Operational Core

- Persistent database and authentication.
- Clients and activity history.
- Jewelry catalog, materials, locations, inventory lots, and stock movements.
- Custom creation projects with files, approvals, milestones, and material allocation.
- Search, filtering, validation, responsive layouts, and audit timestamps.

### Phase 2 - Sales and Finance

- Versioned quotes and conversion workflow.
- Invoices, deposits, multiple payments, balance and overdue calculations.
- Expense and supplier records with receipt attachments.
- Financial overview, basic margin reporting, and management P&L.
- Branded PDF documents and email/share workflow.

### Phase 3 - Trust and Aftercare

- Certificates of authenticity with verification.
- Repair/alteration intake, custody tracking, and release.
- Notifications and reminders for payments, deadlines, stock, and repairs.

### Later, Only When Core Workflows Are Reliable

- Payment-provider integration and reconciliation.
- Customer portal for approvals, quote acceptance, payments, certificates, and repair status.
- Multi-user permissions and accountant access.
- Barcode/QR labels and scanning.
- E-commerce, shipping, consignment, and advanced analytics integrations.
- Optional social-media planner.

## Current Codebase Review

### What Exists

- Vite 6, React 18, TypeScript, Tailwind CSS 4, Recharts, Lucide, and Radix/shadcn-style UI dependencies.
- A desktop dashboard with Overview, Projects, Clients, Inventory, and Social Media screens.
- Manila-oriented fixture data and Philippine peso formatting.
- A separate Accounting component with financial overview, invoice, quote, and expense tabs plus in-memory CRUD modals.
- Toast, modal, and confirmation primitives.
- A coherent warm neutral, charcoal, and gold visual foundation.

### Gaps and Risks

- `App.tsx` duplicates the types and mock data already exported by `data.ts`; the two sources can drift.
- The Accounting component exists but is not imported or reachable from the active app navigation.
- Most visible screens read module-level constants and are not connected to shared mutable state.
- All data is in memory. Refreshing loses changes; there is no database, API, authentication, authorization, audit log, or file storage.
- Projects combine production and payment state (`Paid` is a project stage), which will produce ambiguous workflows.
- Client lifetime spend and inventory status are stored values instead of derived results.
- Accounting totals are simplified. Deposits are embedded on invoices, and there is no payment ledger, partial-payment status, tax/discount handling, refund model, or accounting period logic.
- Expenses and inventory purchases are not linked, which can distort cost and profit calculations.
- Search and the global `New` button are currently visual only.
- There are no certificates, repairs, catalog-piece records, stock movements, document generation, pay links, or public client workflow.
- There is no test suite, lint/type-check script, or CI configuration.
- The production build succeeds, but the main JavaScript bundle is about 576 KB minified and triggers Vite's chunk-size warning. Feature-level lazy loading should be considered as the app grows.
- Remote Google Font imports create a network dependency; production should define an intentional font-loading and fallback strategy.
- The supplied `guidelines/Guidelines.md` is still an empty template. This file is the project source of truth until that document is intentionally replaced or synchronized.

## Engineering Standards

- Keep domain logic separate from presentation components.
- Use a schema-backed persistent store and migrations; do not build production behavior on mock arrays.
- Store money as integer minor units or an exact decimal type. Store metal weights, stone weights, and dimensions with explicit units and suitable decimal precision.
- Store timestamps in UTC and render business dates in `Asia/Manila`; do not infer dates from a browser's locale.
- Derive totals and statuses from ledger or movement records wherever possible.
- Validate at both UI and server boundaries. Treat client input as untrusted.
- Use soft deletion, voiding, or archival for records with financial, certificate, or custody significance.
- Add audit events for status changes, approvals, financial edits, certificate issuance, and custody handoffs.
- Keep uploaded client documents private by default and use access-controlled URLs.
- Apply data minimization and explicit retention practices to client information in line with the Philippines Data Privacy Act and applicable guidance. Confirm legal, tax, invoicing, and payment requirements with qualified local professionals before production launch.
- Test calculations, transitions, and permissions more heavily than static presentation.

## Definition of Done for a Feature

A feature is complete only when:

- Its data persists and remains correct after reload.
- Create, read, update, archive/void, empty, loading, success, and error states are handled as applicable.
- Related records stay linked and derived totals update correctly.
- Keyboard, focus, labels, contrast, and mobile/tablet behavior have been checked.
- Domain calculations and critical transitions have automated tests.
- The production build, type check, lint, and relevant tests pass.
- The implementation follows the design rationale and does not add visual density or ornament without a functional reason.

## MVP Success Criteria

- The owner can find a client or piece quickly from one search surface.
- A commission can move from inquiry to delivered with its approvals, costs, materials, quote, invoice, and payments connected.
- Inventory changes are traceable and low stock is visible before it blocks production.
- The owner can issue a professional quote, invoice, and certificate without retyping core data.
- A repair intake cannot be misplaced without a visible custody and status record.
- Revenue collected, outstanding balances, pipeline, gross margin, expenses, and net profit reconcile to their underlying records for any selected period.
- Core records survive reload, are access-controlled, and preserve a meaningful audit history.

## Guidance for Future Agents

Before implementing a request, check it against this document and the existing domain relationships. Favor the smallest coherent vertical workflow over disconnected screens. Preserve the French Minimal / Louvre-inspired system exactly in spirit: architecture, proportion, material, and restraint. When a choice would make the dashboard feel denser, louder, or more generic, choose the calmer jewelry-specific alternative.

# Seine Studio Operations Platform

## Project Purpose

Build a focused progressive web application for **Seine Studio**, an independent jewelry brand based in Manila. The product may take functional inspiration from Gem Logic, but it must be intentionally scaled for a founder-led starter brand rather than copied as an enterprise jewelry-management suite.

The platform should give the owner one calm, reliable place to manage pieces, clients, commissions, payments, expenses, certificates, repairs, and business performance. It is an internal business application first. A public storefront or marketing website is outside the initial scope unless added later as a separate product surface.

`GemLogic Atelier` is obsolete prototype copy and must be replaced with `Seine Studio`. The product is not affiliated with Gem Logic.

### Current Scope Boundary

This is a private personal operations tool for exactly two approved users: the Seine Studio owner and the developer/support user. It is not a SaaS product and does not need public registration, multiple brands, customer accounts, organization management, or enterprise permissions in its current form.

The current product should:

- Keep operational and financial records in one private application.
- Prefer free tiers and services already paid for by the users.
- Use Neon Postgres Free initially or connect to the existing paid Neon account later without changing the domain model.
- Generate editable HTML/text templates for quotes, invoices, certificates, and Instagram replies.
- Support browser printing and copy-to-clipboard, but not generate PDFs yet.
- Keep direct payment processing, client portals, and social-platform API automation out of the current build.

Features outside this boundary are preserved in the Upgrade Roadmap rather than removed from the long-term product direction.

## Product Principles

1. **Curated, not crammed.** Show the decision or task that matters now. Progressive disclosure is preferable to dense all-in-one screens.
2. **Jewelry-native records.** Metal, karat, stone, dimensions, provenance, labor, and material allocation are first-class fields, not notes attached to generic products.
3. **One connected history.** A client, project, quote, invoice, payment, piece, certificate, repair, and expense should link to each other where applicable.
4. **Starter-brand practicality.** Prioritize reliable workflows, searchable records, document generation, and clear finances before advanced automation.
5. **Trust through traceability.** Important changes, payments, handoffs, and status transitions should be dated and attributable.
6. **Manila by default.** Use Philippine pesos, Philippine contact and address conventions, and `Asia/Manila` for stored/displayed business dates unless a user explicitly changes them.
7. **Calculated truth.** Revenue, balances, inventory value, cost, margin, and profit should be derived from source records rather than manually duplicated.
8. **Mobile at the point of work.** Core tasks must be comfortable on a phone at the workbench, during client meetings, and at handoff or delivery.
9. **Free until reliability earns a bill.** Prefer a small number of integrated services with usable free tiers, but upgrade before free-tier sleep, retention, or backup limits create business risk.

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

### Seine Studio Brand Direction

The supplied Seine Studio mark is preserved at `public/brand/seine-logo-source.png`. It is a monochrome, vertically composed emblem with mirrored floral and sharp calligraphic forms. Its symmetry, tension, and black-on-white treatment can bridge French romanticism with brutalist structure.

Use the brand with restraint:

- Treat the mark as a signature or architectural seal, not a repeating decorative motif.
- Pair delicate serif typography and botanical negative space with brutalist geometry: hard alignment, bold black planes, exposed grids, and decisive scale changes.
- Keep the operational interface calmer than the public brand expression. Finance and inventory screens should privilege legibility over atmosphere.
- Use high-contrast black and warm ivory as the primary brand relationship. Keep museum gold as an operational accent, not a logo effect.
- Do not add faux-French ornament, marble textures, heavy shadows, or ornamental frames.
- Preserve generous negative space around the emblem.

The source PNG is 1234 x 1744 and includes a large white canvas, fine grain, translucent details, and very thin strokes. It is not suitable as-is for a favicon or PWA launcher icon. Before launch, create an approved simplified mark with a transparent background and optical variants for 16, 32, 180, 192, 512, and maskable-icon use. Do not auto-trace or crop the master and call it finished; the smallest sizes need deliberate redrawing and contrast testing.

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
- Mobile is a first-class working environment. Desktop may show more context, but no core workflow may require a desktop viewport.
- Respect reduced-motion preferences. Motion should clarify state, never decorate routine work.

### Mobile Application Shell

- Use a bottom navigation bar on phone with four primary destinations: Home, Projects, Catalog, Clients — plus a More drawer for Inventory, Events, Quotes, Invoices, Expenses, Accounting, Certificates, Repairs, and Reply Templates.
- Put contextual creation in a clearly labeled page action or bottom sheet; avoid a global unlabeled floating `+`.
- Use single-column cards and summary rows below 768 px. Replace wide tables with sortable lists that open a detail screen or sheet.
- Keep touch targets at least 44 x 44 CSS pixels and keep destructive actions away from primary thumb zones.
- Support camera capture for receipts, piece condition, progress photos, and repair intake.
- Make currency and calculator inputs numeric-keyboard friendly. Never hide units, rates, or the basis of a calculated amount.
- Keep primary save/approve actions reachable when the on-screen keyboard is open.
- Respect safe-area insets and test installed mode on iOS Safari and Android Chrome, not only responsive browser emulation.

### Assisted Data Entry

Use searchable comboboxes rather than long static dropdowns. A user should be able to type a client name, SKU, phone number, material, project number, quote number, or invoice number and see ranked suggestions immediately.

Every assisted field must support:

- Recent and frequently used records before the user types.
- Search by human-readable name and stable identifier.
- Useful context in each result, such as client location, available stock, quote status, or project deadline.
- An inline `Create new` action when no suitable record exists.
- Keyboard, touch, screen-reader, empty, loading, and no-result states.
- Clear provenance labels such as `From accepted quote`, `Current inventory cost`, or `Last used rate`.
- Manual override where the workflow permits it, with the override visibly marked and audited.

Forms should progressively populate related data:

- Selecting a client suggests contact and billing details, preferences, recent projects, and default payment terms.
- Selecting a project constrains the client, piece, deadline, pricing version, and related documents.
- Selecting an accepted quote populates an invoice with its immutable line-item snapshot, deposit terms, and client information.
- Selecting an inventory item populates its unit, current cost, location, and available quantity without silently reserving stock.
- Recording a payment recalculates invoice balance and reporting; it does not require the user to update totals elsewhere.
- Completing a piece prepares a certificate draft from the project and catalog record for review.

The user must review generated content before any quote is sent, invoice is finalized, payment is posted, certificate is issued, or stock is consumed. Assistance reduces re-entry; it does not remove accountability.

On mobile, use short step flows such as `Client -> Items -> Payment -> Review`, autosave local drafts, keep the primary action above the keyboard, and put uncommon fields behind an `Additional details` disclosure. A live summary should remain available without forcing the user to leave the form.

### Ownership, Onboarding, and Handoff

The production application should live at a Seine Studio-controlled domain such as `app.seinestudio.com`. The business owner must control the production accounts, domain, billing, data, backups, and recovery methods. The developer receives the second allowlisted account; developer credentials must never be the owner's only route into the system.

First-run onboarding should collect:

1. Business identity, address, contact, invoice details, and timezone.
2. Default currency, payment terms, deposit percentage, numbering rules, and accepted payment methods.
3. Labor rate cards, design-fee defaults, packaging costs, and pricing templates.
4. Initial clients, inventory, and open projects through reviewed import or guided entry.
5. The owner and developer accounts, with public registration disabled.
6. A sample quote-to-payment walkthrough using clearly labeled demo data.

The owner should land on an onboarding checklist and three plain-language actions: `Create custom quote`, `Add client`, and `Record payment`. Include contextual help, a concise operating guide, data export, and a documented support path. Before handoff, verify domain ownership, production access, backup/restore, account recovery, privacy settings, and removal or reduction of developer access.

## Primary User

The primary user is the owner-operator of an independent Manila jewelry brand who manages design, client communication, sourcing, production oversight, and finances. The only other current user is the developer/support user.

Current access is an explicit two-email allowlist with `Owner` and `Developer` roles. Public signup must remain disabled. Studio staff, sales, maker, and accountant roles are upgrade features only.

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
10. **Reply Templates** - reusable Instagram inquiry responses populated from client, pricing, availability, and policy data.
11. **Events & Pop-ups** - plan temporary retail events, reserve and transfer finished stock, prepare supplies and tasks, budget costs, record event sales, and reconcile inventory and profitability.

The current Social Media prototype should be replaced or narrowed to the reply-template library. Scheduling, analytics, publishing, and direct Instagram integration remain optional upgrades.

## Functional Scope

### 0. Custom Pricing Calculator

The uploaded `Seine Studio Financials Tracker.xlsx - Custom Pricing Calculator.csv` is the initial reference for how Seine Studio prices custom work. The current model combines:

- Material line items with description, unit cost, quantity, and extended cost.
- Labor hours multiplied by an hourly rate.
- A separate design fee.
- A separate brand-value markup.
- Packaging and polishing cloth as direct piece costs.
- Net capital defined as materials plus labor plus design fee.
- Total price and per-piece profit.

Observed source values include labor rates of PHP 500/hour and PHP 1,500/hour, design fees of PHP 100 and PHP 800, brand-value additions around PHP 1,000 to PHP 1,700, packaging at PHP 150, and polishing cloth at PHP 16. These are historical examples, not global defaults. Store rates as editable, effective-dated inputs or per-quote snapshots.

The source contains eight pricing blocks and materials such as pearls, jump rings, chain, carabiners, gemstones, silver, necklaces, packaging, and polishing cloth. It also contains incomplete prices, duplicate material names, inconsistent material subtotals, at least one `#VALUE!` result, and cases where a displayed quantity/rate does not agree with the displayed total. Import must therefore stage data for review rather than silently treating every cell as authoritative.

Required calculator behavior:

- Start from a named piece, client/project, pricing date, and optional version.
- Add material rows from inventory or as one-off materials, with description, unit, quantity, unit cost, waste allowance, and calculated extended cost.
- Add labor rows with task/maker, hours, hourly rate, and calculated labor cost.
- Add design fee, packaging, outsourced work, overhead allocation, contingency, discount, and brand-value/creative markup as explicit rows or adjustments.
- Support either a fixed markup amount or percentage, but label the basis clearly and never apply both accidentally.
- Calculate `direct material cost`, `direct labor`, `design/creative cost`, `other direct cost`, `net capital/COGS`, `selling price`, `gross profit`, and `gross margin %` from canonical line items.
- Warn when selling price is below cost, margin is zero/negative, a cost is missing, quantity is zero, or a manual override breaks the normal calculation.
- Preserve the full calculation snapshot on every quote version so later inventory-rate changes do not rewrite historical pricing.
- Allow a draft calculation to become a quote without re-entry, and allow an accepted quote to reserve or consume inventory through explicit movements.
- Keep `brand value markup` as Seine Studio's commercial pricing input; do not misclassify it as an expense or material cost.
- Present both pesos and percentages with full internal precision and deliberate display rounding.

**Implementation status, June 21, 2026:** The first calculator slice is active inside Accounting > Pricing. It supports inventory and tracker-backed material suggestions, one-off cost lines, labor/design/packaging categories, fixed or percentage brand-value markup, discounts, manual selling-price overrides, live profit/margin warnings, project/client population, and conversion into a prefilled draft quote. Calculation outputs normalize to integer centavos. Four automated tests cover the Carlo tracker example, the inconsistent Niqui example, percentage markup, and manual price override. Pricing versions now persist to Neon via `POST /api/pricing` when `VITE_DATA_MODE=api`; localStorage remains the fallback.

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
- Render an editable branded HTML template with `Copy`, `Print`, and `Duplicate` actions.
- Preserve public acceptance and pay-by-link as upgrade features; they are not part of the private MVP.

### 5. Invoice Templates and Payment Records

- Generate professional, editable HTML invoice templates with stable document numbers, browser printing, copy, and duplication.
- Use invoice statuses such as `Draft`, `Sent`, `Partially Paid`, `Paid`, `Overdue`, `Void`, and `Refunded`.
- Record multiple payments against one invoice, including deposits and final balances.
- Store payment date, amount, method, external reference, fees, and notes.
- Support Philippine-friendly methods such as bank transfer, cash, card/payment link, GCash, and Maya without hard-coding a provider into the domain model.
- Calculate balance due from invoice totals, credits, refunds, and payment records.
- Never delete finalized financial records; void or reverse them with an audit trail.
- PDF generation, automated email delivery, payment links, and payment-provider reconciliation are upgrade features.

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

### 10. Instagram Inquiry Reply Templates

Provide a private response library for common Instagram inquiries without connecting to the Instagram API. The user reviews the generated reply and manually copies it into Instagram.

Initial categories:

- Starting prices and budget guidance.
- Custom-order process and consultation steps.
- Deposits, balances, and accepted payment methods.
- Available materials, metals, stones, and customization options.
- Production lead times, rush work, and order status.
- Pickup, delivery, and shipping.
- Repairs, alterations, and aftercare.
- Jewelry care and storage.
- Availability, restocks, and ready-made pieces.

Templates may use approved variables such as `{{client_name}}`, `{{piece_type}}`, `{{starting_price}}`, `{{deposit_percentage}}`, `{{lead_time}}`, `{{material}}`, and `{{pickup_location}}`.

Required behavior:

- Search or filter by question/category.
- Populate variables from the selected client, project, pricing record, inventory, and current studio policies.
- Clearly highlight missing variables before copy.
- Allow editing without overwriting the source template.
- Provide `Copy reply`, `Duplicate template`, and `Save as new version` actions.
- Record optional usage history without storing Instagram credentials or message contents by default.
- Keep direct inbox reading, automatic replies, scheduling, publishing, and analytics in the Upgrade Roadmap.

**Implementation status, June 21, 2026:** The first private reply-library slice is active as a lazy-loaded `Reply Templates` route. It includes eight Seine Studio source templates, category filtering and search, approved-variable rendering, project-to-client and price suggestions, inventory material suggestions, editable studio policies, missing-variable warnings, editable generated copy, clipboard copy, duplication, and local version creation. Built-in source templates remain immutable. Custom templates and versions now persist to Neon via `POST /api/replies` when `VITE_DATA_MODE=api`; localStorage remains the fallback. Direct Instagram access, message storage, automation, publishing, analytics, and shared cross-device history remain deferred upgrades.

### 11. Events and Pop-ups

Provide a private planning and reconciliation workspace for markets, trunk shows, fairs, retail pop-ups, and other temporary selling events. Events are operational records, not generic calendar appointments. They must connect to catalog pieces, inventory locations and movements, expenses, payments, and reporting.

Use the event lifecycle:

`Draft -> Planning -> Packing -> Ready -> Active -> Reconciliation -> Closed`

`Cancelled` is a side state. Closing an event requires a reviewed stock and financial reconciliation rather than a simple status change.

Each event should support:

- Event name, type, organizer, venue, temporary inventory location, address, dates, setup/teardown times, operating hours, contact details, and internal notes.
- Revenue target, event budget, expected gross margin, break-even revenue, and optional contingency.
- Reusable preparation checklist templates with owner, due date, status, notes, and blocking reason.
- Stock-pull planning for finished catalog pieces, display quantities, backup quantities, packaging, certificates, care cards, and event supplies.
- Opening and closing counts with reviewed outcomes for `Sold`, `Returned`, `Damaged`, `Missing`, or `Transferred` stock.
- Planned versus actual expenses, sales, payments, COGS, gross profit, net event profit, average transaction value, and sell-through rate when Phase 2 financial records are available.
- A printable or copyable packing list and event summary; PDF generation remains an upgrade.

#### Stock Pull Planner

The planner should calculate `available to pull = on hand - existing reservations - required studio buffer` from authoritative inventory records. It may suggest stock, but the user must confirm every allocation before a reservation or movement is created.

Suggestions should favor:

- Ready-made finished pieces rather than materials reserved for commissions.
- Pieces with sufficient available quantity and no conflicting reservation.
- A useful mix of categories, collections, price bands, materials, and giftable items.
- Proven sellers and pieces with healthy gross margins, without hiding slower stock the owner may intentionally feature.
- Display and backup quantities appropriate to the event size and revenue target.

Every accepted allocation should create a reservation. Packing should create an explicit transfer from the source location to the temporary event location. Event closeout should create sale, return, damage, loss, or transfer movements; it must never silently overwrite on-hand quantity.

#### Preparation and Day-of Checklist

Default checklist templates should cover venue confirmation and fees, organizer requirements, transport, setup schedule, displays, lighting, mirrors, signage, price labels, packaging, certificates, care cards, payment methods, cash float, receipts, chargers, internet backup, security, opening condition/count evidence, closing count, discrepancy review, and inquiry follow-up. Checklist statuses are `Not Started`, `In Progress`, `Blocked`, and `Complete`.

#### Event Finance Rules

- Separate planned budget lines from posted expenses.
- Link posted event costs to ordinary `Expense` records rather than maintaining a second expense ledger.
- Do not treat stock allocated to an event as an expense. Recognize COGS only for pieces actually sold.
- Distinguish invoiced revenue from payments collected and support cash, bank transfer, GCash, Maya, card/payment link, and other configured methods.
- Calculate break-even revenue from fixed event costs and expected gross margin, while labeling the result as a planning estimate.
- Do not allow the event to close while stock discrepancies or unposted payment differences remain unresolved or explicitly acknowledged.

#### Event Interface

Place `Events` inside the mobile `More` destination so the four-item bottom navigation limit remains intact. `Inventory` also lives in More, keeping the primary nav to four icons for a native app feel. Each event workspace should use calm sections for `Overview`, `Stock Pull`, `Checklist`, `Budget`, `Sales`, and `Reconciliation`, with one clear primary action per stage.

The late Phase 1 slice includes event details, temporary locations, stock suggestions, confirmed reservations/transfers, checklists, budgets, packing lists, and opening/closing counts. Phase 2 adds event-linked sales, payments, actual expenses, margin, profitability, and closeout reporting. Barcode/QR scanning, organizer integrations, lead capture automation, staff scheduling, and commerce synchronization remain upgrades.

## Domain Model

Use stable internal IDs and human-readable document numbers separately. The minimum connected entities are:

- `User`, `Brand`, `Location`, `Client`, `ClientPreference`, `Activity`
- `CatalogPiece`, `Material`, `Stone`, `InventoryLot`, `StockMovement`, `Supplier`
- `Project`, `ProjectMilestone`, `DesignRevision`, `Approval`, `MaterialAllocation`
- `PricingCalculation`, `PricingVersion`, `CostLine`, `RateCard`, `PriceAdjustment`
- `Quote`, `QuoteVersion`, `QuoteLineItem`
- `Invoice`, `InvoiceLineItem`, `Payment`, `Refund`
- `Expense`, `ExpenseCategory`, `Attachment`
- `Certificate`, `CertificateRevision`
- `RepairTicket`, `RepairEvent`, `CustodyEvent`
- `ReplyTemplate`, `ReplyTemplateVersion`, `TemplateVariable`, `ReplyUsage`
- `Event`, `EventTask`, `EventInventoryAllocation`, `EventSupplyRequirement`, `EventBudgetLine`, `EventSale`, `EventReconciliation`

Important relationships:

- A client can have many projects, transactions, certificates, and repair tickets.
- A project may originate from one accepted quote and may have multiple invoices and payments.
- A quote version should reference an immutable pricing-version snapshot rather than a live mutable calculator.
- An inventory lot can contribute to multiple pieces or projects through stock movements and allocations.
- A finished piece can have one active certificate with an immutable issuance history.
- A repair ticket may link to an existing piece, but must also support unregistered client-owned jewelry.
- An event uses a temporary `Location`; accepted stock allocations create reservations, transfers, and reconciled stock movements rather than a separate event-only quantity.
- Event budget lines are planning records. Actual costs reference ordinary `Expense` records, and event sales reference ordinary invoice, payment, and stock-movement records where applicable.
- One catalog piece or inventory lot may be allocated to many events over time, but overlapping reservations must never exceed its available quantity.

## Recommended Technical Architecture

### Decision

Keep the existing **React + TypeScript + Vite** application and evolve it into a responsive PWA. Do not migrate to Next.js or build separate iOS and Android applications for the MVP. Seine Studio needs one codebase, installability, camera-friendly mobile workflows, and inexpensive hosting more than it needs server-rendered marketing pages or native-platform maintenance.

### Application Stack

| Layer                  | Recommendation                             | Rationale                                                                                                                                                                          |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                     | React 18, TypeScript, Vite                 | Already present, fast static builds, large ecosystem, and no migration cost. Upgrade versions deliberately rather than during feature work.                                        |
| Styling                | Tailwind CSS 4 plus semantic CSS variables | Existing foundation; tokens can enforce the Louvre palette and keep dense operational screens consistent.                                                                          |
| Accessible primitives  | Radix UI/shadcn-style local components     | Already present and appropriate when components remain owned by the repo rather than treated as a black-box design system.                                                         |
| Routing                | React Router                               | Already installed; gives stable, linkable record URLs and nested mobile/desktop layouts.                                                                                           |
| Forms and validation   | React Hook Form plus Zod                   | Keeps long pricing and intake forms performant while sharing validation contracts.                                                                                                 |
| Server state           | TanStack Query                             | Handles caching, retries, invalidation, optimistic UI, and online/offline transitions more reliably than ad hoc component state.                                                   |
| Local/offline data     | IndexedDB via Dexie                        | Suitable for cached read models, draft forms, photo-upload queues, and an explicit sync outbox. Do not use it as an independent financial source of truth.                         |
| PWA                    | `vite-plugin-pwa` with Workbox             | Generates the manifest and service worker inside the existing Vite build. Use controlled update prompts for active form sessions rather than silently replacing the app mid-entry. |
| Charts                 | Recharts initially                         | Already installed. Lazy-load reporting routes because the current production bundle already exceeds Vite's default size warning.                                                   |
| Unit/integration tests | Vitest, React Testing Library, MSW         | Fits Vite and supports calculation, validation, and data-state tests without a remote backend.                                                                                     |
| End-to-end/PWA tests   | Playwright plus Lighthouse CI              | Covers installed/mobile workflows, service-worker updates, offline shell behavior, and accessibility/performance budgets.                                                          |

### Backend and Infrastructure

| Layer             | Recommendation                                       | Free/low-cost posture and trade-off                                                                                                                                            |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Database          | Neon Postgres                                        | Use Neon Free initially or the existing paid Neon account later. Keep ordinary PostgreSQL tables and migrations so the app is portable.                                        |
| Database access   | Drizzle ORM from server functions only               | Provides typed queries and migrations without exposing database credentials to the browser.                                                                                    |
| Authentication    | Neon Auth with an explicit two-email allowlist       | Disable public signup. Permit only the owner and developer accounts. If Neon Auth does not fit at deployment time, replace only the auth adapter rather than the domain layer. |
| Authorization     | Server-enforced `Owner` and `Developer` roles        | Two roles are enough for the private tool. Validate the authenticated user and allowlist on every API request.                                                                 |
| Server API        | Cloudflare Pages Functions                           | Keeps Neon connection strings and privileged operations off the client while remaining within a practical free tier for two users.                                             |
| File storage      | None required for the first release                  | Store structured records and optional external file links. Add private Cloudflare R2 storage only when receipts, sketches, or repair photos become necessary.                  |
| Hosting/CDN       | Cloudflare Pages                                     | Static Vite output is a good fit. The current Free plan allows 500 builds/month and custom domains, more than enough for an early internal application.                        |
| Document output   | React-rendered HTML/text templates                   | Supports editing, copying, duplication, and browser printing without PDF infrastructure. Snapshot issued values so later edits do not change old records.                      |
| Instagram replies | Local template engine plus clipboard                 | Populate approved variables and copy manually. Do not store Instagram credentials or add Meta API dependencies in the current release.                                         |
| Error monitoring  | Sentry free tier or equivalent, added before pilot   | Capture release, route, and sanitized stack context. Never send client notes, jewelry photos, financial line items, or authentication data to monitoring.                      |
| CI/CD             | GitHub Actions plus Cloudflare Pages Git integration | Run type check, lint, unit tests, and build on pull requests; deploy `main` automatically. See `.github/workflows/`. |

As of June 2026, the relevant free-tier limits must be verified again immediately before launch because vendor pricing changes. Avoid architecture that assumes a free tier is an SLA.

Official references, last checked June 21, 2026:

- Neon pricing and Free/Launch limits: <https://neon.com/pricing>
- Cloudflare Pages Free limits: <https://developers.cloudflare.com/pages/platform/limits/>
- Vite PWA setup and service-worker behavior: <https://vite-pwa-org.netlify.app/guide/>
- Vite PWA installability requirements: <https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html>

### Cost Path

- **Prototype and private use:** approximately USD 0/month using GitHub, Cloudflare Pages/Functions Free, and Neon Free.
- **Existing paid Neon path:** connect the same schema and migrations to the paid Neon account when desired; no database-provider migration should be required.
- **Backups:** schedule regular CSV/JSON exports regardless of provider tier. Confirm Neon restore and retention limits on the selected plan before relying on it as the only recovery mechanism.
- **Later costs:** custom domain renewal, optional private object storage, monitoring, email delivery, and payment-provider transaction fees. Add them only when the corresponding upgrade is enabled.

### PWA and Offline Contract

The PWA must provide:

- An installable manifest named `Seine Studio` with approved icons, `display: standalone`, theme colors, and mobile screenshots when available.
- A service worker that precaches the app shell and versioned static assets.
- Network-aware UI with clear `Offline`, `Saving`, `Queued`, `Synced`, and `Conflict` states.
- Cached read access to recently opened clients, pieces, projects, and repair tickets, subject to explicit local-data retention limits.
- Offline draft creation for notes, pricing calculations, inventory counts, and repair intake, stored in IndexedDB and synchronized through an outbox when connectivity returns.
- A deliberate update prompt that never discards an active draft.

The PWA must not:

- Mark invoices paid, finalize financial records, issue certificates, or permanently decrement stock while offline without server confirmation.
- Cache authentication responses, signed private-file URLs, or sensitive API responses indiscriminately.
- claim that offline drafts are backed up before they reach the server.
- Resolve write conflicts by last-write-wins for prices, payments, inventory, certificates, or custody events.

### Security and Recovery Baseline

- Never expose a Neon connection string or privileged database credential in the browser or `VITE_*` environment variables.
- Keep Neon credentials and future provider secrets only in Cloudflare server-function environment configuration.
- Enforce the two-email allowlist and `Owner`/`Developer` role on the server, not only in the interface.
- Disable public registration and test that unauthenticated and non-allowlisted requests fail.
- Encrypt transport with HTTPS. If private object storage is added later, use short-lived signed URLs.
- Provide CSV/JSON exports for clients, catalog, inventory, pricing, invoices, payments, and expenses.
- Establish a restore test and documented backup/export cadence before relying on the system for daily operations.
- Minimize offline retention of client and financial data and provide a `Clear local data` control.
- Redact sensitive fields from logs, analytics, crash reports, and notification previews.

### GitHub Actions CI/CD (June 27, 2026)

Two workflows in `.github/workflows/`:

- **`ci.yml`** — Runs on PRs: lint, typecheck, migrations (local Postgres), tests, build. Uses a local PostgreSQL service container, not Neon.
- **`deploy.yml`** — Runs on main push: lint, typecheck, migrations (Neon production), tests, build (API mode), deploy to Cloudflare Pages.

**Required GitHub Secrets:**

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Neon production connection string for migrations |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

**Required GitHub Variables:**

| Variable | Purpose |
|----------|---------|
| `VITE_NEON_AUTH_URL` | Neon Auth root URL (no `/neondb/auth` suffix) |

Set these in GitHub repo → **Settings → Secrets and variables → Actions**.

## MVP and Delivery Plan

### Phase 0 - Stabilize the Prototype

**Status: Engineering stabilization complete June 21, 2026.**

Completed foundation slice:

- Consolidated the active application onto shared types, fixture data, constants, and formatters from `src/app/data.ts`.
- Connected the existing Accounting module to active desktop and mobile navigation.
- Replaced visible prototype branding with Seine Studio and preserved the supplied logo source in the project.
- Added a responsive phone shell with five bottom-navigation destinations and safe-area spacing.
- Added Vite PWA manifest/service-worker generation, an offline status notice, and a user-controlled update prompt.
- Added TypeScript checking and a combined `npm run check` command.
- Added Vitest and tracker-based pricing calculation tests.
- Updated vulnerable React Router and Vite versions identified during the baseline audit; `npm audit` reports zero known vulnerabilities.
- Pinned Node 22 LTS for supported local and CI builds.
- Added a mobile-ready custom pricing calculator with assisted material entry and prefilled quote handoff.
- Split the application shell, core pages, Accounting fixtures, and Accounting modal workflows into focused modules; `App.tsx` is now approximately 236 lines and `AccountingPage.tsx` approximately 640 lines.
- Removed the obsolete social-calendar prototype and lazy-loaded Accounting and Reply Templates by route.
- Added stable record URLs for projects, clients, and inventory, including URL-backed detail selections.
- Removed the ambiguous global `Create` action; creation remains attached to named workflows such as `New invoice`, `Log expense`, `Prepare quote`, and `Duplicate template`.
- Added ESLint, Prettier, Playwright, unit-test, type-check, build, and combined check commands. TypeScript is pinned to supported stable version 5.9.
- Added nine unit tests, including pricing versioning and reviewed tracker-import staging coverage.
- Added six passing browser checks across desktop and mobile for installability, service-worker updating, offline reload, and Accounting navigation.
- Added append-only browser pricing snapshots and a CSV review stage that flags invalid formulas, missing inputs, and price/quantity mismatches before a block can be loaded.
- Added semantic brand/status tokens and replaced the inventory table with phone-native summary/detail cards below the desktop breakpoint.
- Added a simplified vector signature mark derived from the supplied emblem, transparent 16/32/180/192/512 PNG assets, and safe-zone-tested 192/512 maskable launcher assets. The PWA manifest, favicon, and Apple touch icon now use these production candidates.
- Replaced Accounting invoice, quote, and expense tables with phone-native record cards below the desktop breakpoint. Mobile actions remain visible and meet the 44px touch-target rule.
- Migrated the remaining frequently repeated Accounting and shell palette literals into semantic theme tokens.

Phase 0 completion notes:

- The owner must visually sign off on the simplified launcher mark before public release; the required asset set and manifest wiring are complete.
- Local immutable pricing snapshots and reviewed imports intentionally move to Neon in Phase 1 so both users share the same durable history. This is no longer Phase 0 work.
- Future screens must continue the established token and responsive-card patterns as their workflows are added.

### Phase 1 - Operational Core

**Status: Foundation in progress as of June 22, 2026.**

Implemented foundation checkpoint:

- Added a server-only Neon HTTP and Drizzle boundary, generated PostgreSQL migrations, and documented local and Cloudflare configuration without exposing `DATABASE_URL` to Vite.
- Added the initial connected schema for the two application users, clients, locations, catalog pieces, inventory lots, append-only stock movements, custom projects, immutable pricing versions, reply-template versions, activity events, and late Phase 1 event planning.
- Added event details, tasks, planned budget lines, inventory allocations, and links from ordinary stock movements to events. Event stock remains part of the authoritative inventory ledger.
- Added Neon Auth JWT verification against the branch JWKS plus a server-enforced owner/developer email allowlist. Public signup still must be disabled in the Neon console when the project is provisioned.
- Added public health and protected current-user endpoints plus the first protected Clients list/create API. Client creation and its audit event are submitted as one Neon HTTP transaction batch.
- Added shared client input validation, a credentialed browser API helper, public auth client configuration, separate browser/Worker type checking, and tests for client normalization, environment validation, and allowlist behavior.
- Preserved the fixture-driven UI until Neon credentials are connected. No production screen should switch to the API without explicit loading, empty, error, offline, and conflict states.

Integration checkpoint, June 22, 2026:

- Connected the existing Neon project `Seine Studio` and confirmed its PostgreSQL 18 production branch and managed Neon Auth service.
- Corrected JWT verification to use the managed Neon Auth `/.well-known/jwks.json` endpoint.
- Applied and verified the Phase 1 schema on a temporary Neon migration branch, then promoted migration `7b1a64e8-22c2-4533-a716-210759230ffc` to production after explicit approval. Production readback confirmed all 16 application tables, relationships, indexes, constraints, and the existing Neon Auth schema; operational tables started empty.
- Created the Cloudflare Pages project `seine-studio` with `main` as production, `npm run build`, `dist`, Pages Functions compatibility settings, and fail-closed behavior.
- Added the Neon database secret and public/server Auth URLs to Cloudflare Preview and Production configuration. The owner and developer allowlist emails remain unset until both addresses are confirmed.
- Added ignored local Neon and Auth configuration for full-stack development; no secret values are tracked by Git.

Clients vertical slice, June 22, 2026:

- Replaced the static Clients prototype with a lazy-loaded, searchable client registry and a phone-native list-to-detail route.
- Added create, edit, and soft-archive workflows with shared validation, accessible form names, explicit loading/error/empty states, and user feedback.
- Added protected client detail, update, archive, and activity-history API behavior. Database writes record immutable `client.created`, `client.updated`, and `client.archived` activity events.
- Removed stored lifetime-spend claims from the operational client view. Projects and spend are labeled as future derived results until their authoritative records are connected.
- Kept a clearly labeled in-memory sample workspace for local previews. Cloudflare must not enable `VITE_DATA_MODE=api` until both allowlist accounts and the sign-in screen are configured.

Sign-in screen, June 22, 2026 (updated June 27, 2026):

- Added a browser sign-in screen using `@neondatabase/auth`. Originally used `BetterAuthReactAdapter` for React hooks, but this was replaced with direct `fetch()` calls to Neon Auth's REST endpoints because the better-auth adapter tried to call API routes that don't exist on Neon's managed auth service (causing a hanging "Loading session…").
- Auth architecture: `VITE_NEON_AUTH_URL` points to the Neon Auth **root domain** (no `/neondb/auth` subpath) for REST API calls. The server-side `NEON_AUTH_URL` secret keeps the `/neondb/auth` subpath for JWKS verification. These are two different URL paths on the same host.
- REST endpoints used: `POST /api/auth/sign-in/email`, `POST /api/auth/sign-up/email`, `POST /api/auth/sign-out`, `POST /api/auth/email-verification/verify-email`.
- The sign-in page matches the French Minimal / Louvre-inspired design language: centered Seine Studio logo, warm canvas, serif heading, uppercase label typography, hairline borders, and dark charcoal primary action.
- `App.tsx` gates on `authorizedRole` from `/api/me` rather than session state. `useSession()` returns a static `{ data: null, isPending: false }` to prevent hanging.
- When auth is not configured (local fixture mode), the app loads directly without a sign-in gate.
- Sign-up is available for initial account creation; the server-side allowlist (`OWNER_EMAIL`, `DEVELOPER_EMAIL`) still blocks unauthorized accounts from accessing any protected endpoint regardless of whether they can create a Neon Auth account.
- The sidebar footer now shows the authenticated user's name and initials derived from the session, plus a sign-out button. In fixture mode it falls back to the existing placeholder.
- Supports sign-in, sign-up, verification code entry, and forgot-password flows with inline error display, loading state, and mode toggle.
- Neon Auth email verification must be temporarily disabled in the Neon Console while setting up accounts, then re-enabled after.
- Trusted origins configured: `https://seine-studio.pages.dev`, `https://*.seine-studio.pages.dev`, `http://localhost:5173`.
- Full changelog at [docs/post-deployment-fixes.md](docs/post-deployment-fixes.md).

Catalog & Inventory vertical slice, June 22, 2026:

- Added server validation schemas for locations, catalog pieces, inventory lots, and stock movements in `src/server/inventory/input.ts`.
- Added protected Cloudflare Pages Functions API endpoints: `GET/POST /api/locations`, `PATCH /api/locations/:id`, `GET/POST /api/catalog`, `GET/PATCH/DELETE /api/catalog/:id`, `GET/POST /api/inventory`, `GET/PATCH/DELETE /api/inventory/:id`, and `POST /api/inventory/movements`.
- Inventory lot creation automatically records an initial `receipt` stock movement to the specified location.
- On-hand quantity is derived from `initialQuantity` plus/minus the sum of stock movements by type (receipt/return/release add; consume/sale/damage/loss/reserve subtract), never stored as a mutable field.
- Lot detail endpoint returns the lot record, its complete movement history with location names and actor display names, and activity events.
- All create, update, and archive operations record immutable activity events for audit. Stock movements are append-only and also audit-logged.
- Replaced the fixture-only `InventoryPage` in `CorePages.tsx` with a lazy-loaded, database-connected `InventoryPage` in `src/app/components/InventoryPage.tsx`.
- The new inventory UI provides: searchable lot list, kind filter buttons (All/Material/Finished Piece/Packaging/Supply), list-to-detail phone layout, lot detail with on-hand/status/cost/value, movement history timeline, "Receive lot" form with lot code/kind/description/quantity/unit/cost/location, "Record movement" form with type/quantity/from-to locations/reason, and archive with confirmation.
- Low-stock and out-of-stock alerts are derived from on-hand quantity (threshold: 5 units), not stored status fields.
- Client-side types, fixture-to-record adapter, and stock status derivation are in `src/app/inventory.ts`.
- Fixture mode continues to work with the in-memory sample workspace when `VITE_DATA_MODE` is not `api`.
- InventoryPage is now lazy-loaded as a separate 15.5 KB chunk, keeping the initial bundle under control.

Allowlist and auth verification, June 22, 2026:

- Local `.dev.vars` configured with both allowlisted accounts: `seinestudio.info@gmail.com` (Owner) and `andrelawas35@gmail.com` (Developer).
- Cloudflare Pages environment variables for `OWNER_EMAIL` and `DEVELOPER_EMAIL` must be set via the Cloudflare Dashboard or `wrangler pages secret put`.
- Configured Neon Auth trusted origins via the Neon MCP: `https://seine-studio.pages.dev` (production), `https://*.seine-studio.pages.dev` (preview deployments), and localhost (enabled via `allow_localhost: true`). This resolved the "invalid origin" error on deployed sign-up/sign-in requests.
- Auth verification pending: owner must confirm sign-up/sign-in works with both allowlisted emails on the deployed Preview, and that an unlisted email receives a 403 from protected API routes.

**Checkpoint, June 22, 2026 — Pricing and reply-template API persistence:**

- Created server validation schemas in `src/server/pricing/input.ts` for pricing calculations, pricing versions, reply templates, and reply template versions (all using Zod).
- Added four Cloudflare Pages Function endpoints: `POST /api/pricing` (create calculation + first version), `POST /api/pricing/[calculationId]/versions` (append version), `POST /api/replies` (create template + first version), `POST /api/replies/[templateId]/versions` (append version). All list endpoints (`GET /api/pricing`, `GET /api/replies`) return records with their latest versions.
- Updated `PricingCalculator.tsx` — `saveVersion()` now also persists to Neon via `apiRequest` when `VITE_DATA_MODE=api`. Falls back to localStorage silently on API failure.
- Updated `ReplyTemplatesPage.tsx` — `duplicateTemplate()` and `saveVersion()` now also persist to Neon via `apiRequest` when `VITE_DATA_MODE=api`. Falls back to localStorage silently on API failure.
- All endpoints enforce auth, create activity events for audit trail, and use append-only versioning (matching the inventory pattern).
- TypeScript compiles clean with no errors.
- Note: Reviewed CSV import and saved pricing drafts remain as follow-up work within this item.

**Checkpoint, June 22, 2026 — Reviewed CSV import and saved pricing drafts:**

- Reviewed CSV import was already functional (tracker blocks staged for review, loaded on user confirmation). Saving a loaded block as a version now persists to Neon when `VITE_DATA_MODE=api`.
- Added saved pricing drafts: `GET /api/pricing` returns saved calculations with all their versions. Calculator now shows a "Saved pricing drafts" panel listing database-backed calculations with a "Load" button that restores the latest version's full state (lines, markup, discount, override) into the calculator.
- Saving a version to an active (loaded) calculation appends via `POST /api/pricing/[calculationId]/versions` instead of creating a new calculation each time.
- Save button shows "Save new version" when editing an active draft, and disables during save with a "Saving…" indicator.
- Local pricing history remains available alongside database drafts.

**Checkpoint, June 22, 2026 — Custom creation projects:**

- Created `src/app/projects.ts` with `ProjectRecord`, `ProjectFormValues`, stage labels/colors/pills, fixture-to-record adapter, and form conversion helpers.
- Created `src/server/projects/input.ts` with Zod validation schemas for creating, updating, and listing projects.
- Added API endpoints: `GET/POST /api/projects` (list with search/stage filter, create with client join and activity event), `GET/PATCH/DELETE /api/projects/[projectId]` (detail with activity, update with audit, soft archive).
- Built `src/app/components/ProjectsPage.tsx` — a full database-aware replacement for the old fixture-only Kanban view. Features: searchable list with stage filters and counts, list-to-detail phone layout, project detail with stage pill/brief/dates/activity timeline, create/edit modal with client select, archive with confirmation dialog. Supports both fixture and database modes via `VITE_DATA_MODE`.
- Lazy-loaded the new ProjectsPage in App.tsx with Suspense. Removed the old ProjectsPage from CorePages.tsx.
- TypeScript compiles clean.

**Checkpoint, June 22, 2026 — IndexedDB drafts and explicit sync:**

- Upgraded the Dexie local database to version 2 with durable `pending`, `syncing`, `failed`, and `conflict` outbox states plus timestamps and retry counts.
- Added a global Sync Status control in API mode. It shows queued, failed, and conflicting changes; synchronization occurs only through `Sync now`, with explicit retry and discard actions.
- Added device-local client drafts with save, load, and discard controls. New clients entered offline remain drafts rather than pretending to exist in Neon.
- Existing client edits made offline are applied optimistically and queued with the server record version they were based on. The Clients API now returns `409 client_conflict` when another device changed that record first, preventing silent last-write-wins behavior.
- Client archive remains connection-required because archival is a durable workspace action. Financial finalization and stock decrement remain outside the offline outbox by design.
- Added CSV and JSON export actions to Clients, Projects, and Inventory. Restore testing and full backup coverage for every future financial entity remain outstanding.
- Corrected the auth gate so fixture mode remains local even when an Auth URL exists, while API mode requires both a valid Neon session and successful `/api/me` allowlist verification before rendering the application shell.
- Extended device-local drafts to Projects, inventory receipts, and stock-count/movement forms. Each form can save, reload, and discard up to its current device history without claiming that Neon has accepted the change.
- Existing Project edits can now queue offline with the server `updatedAt` version. The Projects API returns `409 project_conflict` when the base version is stale, matching the client conflict workflow.
- New Projects entered offline remain drafts. Inventory receipts and movements also remain drafts until connected because they change authoritative stock; they are never placed in the automatic write outbox.
- Project and inventory archival remain connection-required and cannot be queued.

**Checkpoint, June 22, 2026 — Portable backup and restore:**

- Added a read-only full-database backup command covering all 16 application tables in a repeatable-read snapshot. Its JSON manifest records the format version, schema fingerprint, source, timestamp, row counts, and a SHA-256 checksum for every table.
- Added a guarded restore command that requires a separately supplied target connection, exact migrated schema, and empty application tables. It restores in dependency order inside one transaction and verifies all table counts and checksums by reading the target back.
- Added an owner-facing weekly backup cadence, quarterly temporary-branch restore test, encrypted-storage guidance, and disaster-recovery runbook. Backup files are permission-restricted and excluded from Git.

**Checkpoint, June 27, 2026 — Late Phase 1 event workspace:**

- Built all six event API endpoints: list/create events, event detail with tasks/allocations/budget/stock suggestions, create/update tasks, create budget lines, and create stock allocations with reservation movements and studio buffer enforcement.
- Zod validation schemas for event creation, task create/update, budget lines, allocations, and list queries.
- Event detail endpoint derives available stock from append-only movement sums, applies the studio buffer percentage, and returns stock suggestions for finished pieces only.
- Allocation endpoint validates lot kind, source location, and buffer-adjusted availability before creating the reservation movement.
- EventsPage UI with searchable list, tab workspace (overview/stock/checklist/budget), task toggle, budget line creation, and stock allocation modal with buffer calculation — all wired to API when `VITE_DATA_MODE=api`.

**Checkpoint, June 27, 2026 — Launch-readiness audit and fixes:**

- Fixed a critical inventory bug: on-hand quantity was double-counted because both the list and detail endpoints seeded the balance with `initialQuantity` on top of the initial `receipt` movement. On-hand is now derived purely from append-only movements, consistent with the event stock-pull planner.
- Replaced the directionless `adjustment` stock movement (ambiguous with a positive-only quantity) with directional `adjustment_increase` / `adjustment_decrease` types. Legacy `adjustment` is retained as an unused enum tombstone; the API now rejects it. Balance math in the inventory and event endpoints honours the new directional types.
- Extended the project lifecycle with the operational stages `consultation`, `sourcing`, and `closed` (payment-gated `deposit_pending` / `balance_due` deferred to Phase 2 finance). Enum values appended in migration `0002_extended_lifecycle_stages`; logical display order is controlled by `STAGE_ORDER` on the client.
- Added `flex-wrap` to the Clients/Inventory/Projects header action rows so export buttons do not overflow on narrow phones.
- Verified: typecheck (client + functions), 30 unit tests, and production build all pass.
- Outstanding optional polish: ~~hide the cosmetic sign-up form~~ ✅ DONE (June 27, 2026), ~~add `apple-touch-icon` to index.html~~ ✅ already present, move react/react-dom to `dependencies`, and (later) add an event `on_hold` side state.

Phase 1 implementation is complete:

- Neon Postgres schema, Drizzle migrations, Cloudflare Pages Functions, and two-user authentication.
- Server-enforced owner/developer allowlist with public registration disabled.
- Clients and activity history.
- Jewelry catalog, materials, locations, inventory lots, and stock movements.
- Custom creation projects with files, approvals, milestones, and material allocation.
- Search, filtering, validation, responsive layouts, and audit timestamps.
- CSV/JSON export, backup procedure, and restore test.
- IndexedDB draft/outbox foundation with explicit sync and conflict states.
- Instagram inquiry reply templates with approved variables and copy-to-clipboard.
- Late Phase 1 event/pop-up planning: event details, temporary locations, stock-pull suggestions, reservations and transfers, preparation checklists, budgets, packing lists, and opening/closing inventory counts.

### Phase 2 UI Foundation (do first)

Decided in the June 27, 2026 launch-readiness grilling. Build this shared
foundation before Phase 2 features so they inherit it. See
[ADR 0001](docs/adr/0001-phase-2-ui-foundation.md),
[ADR 0002](docs/adr/0002-shared-document-canvas.md), and the domain glossary in
[CONTEXT.md](CONTEXT.md).

- **Type-scale tokens, no strain.** ✅ DONE (June 27, 2026). Eliminated all
  sub-11px text across every page. Floor: `eyebrow` 11px uppercase tracked,
  `caption` 12px, `body` 14px. Swept: OverviewPage, ClientsPage, InventoryPage,
  ProjectsPage, EventsPage, PricingCalculator, ReplyTemplatesPage, App.tsx
  (sidebar + topbar). Post-deployment sweep (June 27): AccountingPage had 28+
  instances of `text-[9px]`/`text-[10px]` — all replaced with `text-[11px]`/
  `text-[12px]`. Bottom nav labels at 8px remain intentional (standard mobile
  nav pattern).
- **Seine Studio branding.** ✅ DONE (June 27, 2026). Created `SeineMark`
  inline SVG component. Sidebar uses gold botanical mark + serif wordmark.
  Mobile TopBar branded with mark + "Seine Studio" + page-name eyebrow. Added
  gold accent eyebrows ("Client registry", "Materials & stock", "Custom
  creations", "Event workspace", "Custom pricing", "Private response library")
  across all page headers.
- **Adopt existing primitives.** ✅ DONE (June 27, 2026). Created reusable
  `Combobox` component (`src/app/components/ui/combobox.tsx`) wrapping
  `command` + `popover` primitives. Replaced all native `<select>` elements in
  ProjectsPage (Stage, Client) and InventoryPage (Kind, Location, Movement type,
  From/To location) with searchable comboboxes. Delivers the Assisted Data Entry
  principle — users can type to filter options instead of scrolling.
- **`ResponsiveTable`.** ✅ DONE (June 27, 2026). Built generic
  `ResponsiveTable<T>` + `ResponsiveTableSkeleton` primitive
  (`src/app/components/ui/responsive-table.tsx`). Full table ≥640px, stacked card
  rows below. Adopted in Overview page Recent Projects section. Clients,
  Projects, and Inventory pages use a master-detail sidebar layout instead —
  ResponsiveTable applies to Phase 2 financial lists (quotes, invoices).
- **`DocumentCanvas`.** ✅ DONE (June 27, 2026). One shared A4/Letter print
  component (serif masthead, hairline rules, `@media print`, tabular-num
  currency, immutable snapshot) for quotes, invoices, and certificates. Built
  in `src/app/components/DocumentCanvas.tsx` with `DocumentLineTable`,
  `DocumentTotals`, snapshot rendering, and Copy/Print/Duplicate toolbar.
- **Light-only at launch.** ✅ DONE (June 27, 2026). Removed the unthemed gray
  `.dark` CSS block and `@custom-variant dark` from `theme.css`. Inert `dark:`
  utility classes in shadcn primitives left in place (harmless without the
  variant definition). A brand-correct warm-charcoal dark theme is a post-launch
  upgrade.
- **Modern, on-brand touches.** ✅ DONE (June 27, 2026). Warm skeleton loaders
  (`bg-[#EDE5D5]`), fluid `clamp()` type tokens (`--text-eyebrow`,
  `--text-caption`, `--text-body`, `--text-body-lg`, `--text-input`), Tailwind
  v4 container queries (`@container display-case` with `.dc-col-2`, `.dc-col-3`,
  `.dc-row`), gold reserved for active-nav hairline + focus ring,
  reduced-motion-respecting 150ms transitions. All implemented in
  `src/styles/theme.css`.

### Phase 2 - Sales and Finance

**Status: Foundation complete as of June 27, 2026.**

- ✅ Versioned quotes and conversion workflow. `QuotesPage` with search,
  status filters, list-to-detail layout, create modal with client Combobox,
  DocumentCanvas preview, status management, and activity timeline. API:
  `GET/POST /api/quotes`, `GET/PATCH /api/quotes/[quoteId]`,
  `GET/POST /api/quotes/[quoteId]/versions`.
- ✅ Invoices, deposits, multiple payments, balance and overdue calculations.
  `InvoicesPage` with search, status/overdue filters, DocumentCanvas preview,
  payment recording modal (amount, method Combobox, reference, date), balance
  tracking, void action, and payment history. API: `GET/POST /api/invoices`,
  `GET/PATCH /api/invoices/[invoiceId]`, `GET/POST /api/payments`.
- ✅ Expense and supplier records. `ExpensesPage` with search, category/COGS
  filters, list-to-detail layout, create modal with inline supplier creation and
  Combobox, edit support, activity timeline, and COGS/OPEX summary bar. API:
  `GET/POST /api/expenses`, `GET/PATCH /api/expenses/[expenseId]`,
  `GET/POST /api/suppliers`, `GET/PATCH /api/suppliers/[supplierId]`.
- ✅ Financial overview and management P&L. `AccountingPage` now fetches real
  invoice, expense, and payment data from the API when `VITE_DATA_MODE=api`.
  Overview tab shows COGS/OPEX split, links to dedicated Invoices/Expenses/
  Quotes pages, and keeps the Pricing Calculator. Fixture mode preserved for
  local development.
- ✅ Editable branded HTML/text templates with copy, duplicate, and
  browser-print workflows. `DocumentCanvas` shared component with Print/Copy/
  Duplicate toolbar, A4/Letter geometry, and `@media print` stylesheet.
- ✅ Event-linked financial closeout. New "Finance" tab in `EventsPage` shows
  revenue (collected, outstanding, vs target), profitability (COGS, OPEX, gross
  profit, net profit), budget vs actual variance, break-even estimate, and
  linked expense/invoice counts. Fetches from `/api/expenses?eventId=` and
  `/api/invoices`.

### Phase 3 - Trust and Aftercare

**Status: Complete as of June 27, 2026.**

- ✅ Certificates of authenticity with verification. `CertificatesPage` with
  search, status filters (draft/issued/revoked/reissued), list-to-detail layout,
  create modal with catalog piece + client Combobox links, issue/revoke/reissue
  workflow with audit trail, revision history, and verification code generation.
  API: `GET/POST /api/certificates`, `GET/PATCH /api/certificates/[certId]`.
  Schema: `certificates`, `certificate_revisions` with `certificate_status` enum.
- ✅ Repair/alteration intake, custody tracking, and release. `RepairsPage` with
  search, status filters, overdue detection, list-to-detail layout, create modal
  with client Combobox, status transition buttons with custody event logging,
  custody trail timeline (who moved what where when), and full activity history.
  API: `GET/POST /api/repairs`, `GET/PATCH /api/repairs/[ticketId]`.
  Schema: `repair_tickets`, `repair_events` with `repair_status` enum and
  9-stage lifecycle (received → assessed → awaiting_approval → in_service →
  waiting_for_parts → quality_check → ready → released; cancelled as side state).
- ✅ Notifications and reminders for payments, deadlines, stock, and repairs.
  `NotificationsPanel` with `useNotifications` hook fetches overdue invoices,
  low stock (≤5 units), overdue repair tickets, and overdue projects from the
  API. Bell icon with red badge count in TopBar. Slide-out panel sorted by
  priority (high/medium/low), with a gear icon linking to notification settings.
  Best-effort aggregation — individual API failures do not block the panel.
  Refresh on notification panel close.
- ✅ iOS push notifications and daily reminders. `NotificationSettings` panel
  accessible from the bell → gear icon. Supports: request system permission,
  Web Push subscription (VAPID P-256 keys), enable/disable push, daily reminder
  toggle, and configurable reminder hour (0–23). Custom service worker
  (`src/sw.ts`, injectManifest strategy) handles `push` events, `notificationclick`
  to open the app, and a best-effort `setTimeout`-based daily reminder scheduler
  that re-fires every 24h. Client-side daily reminder check runs on every app
  load via `useEffect` — shows a local notification if >24h since last reminder.
  Server API: `GET /api/notifications/status`, `POST /api/notifications/subscribe`,
  `PATCH /api/notifications/preferences`, `DELETE /api/notifications/unsubscribe`.
  Schema: `push_subscriptions` table with per-user endpoint, keys, reminder
  preferences, and last-reminded timestamp. Migration `0005_floral_morning`.

Database migration `0004_cerulean_phantom` adds:
- `certificate_status` enum (draft, issued, revoked, reissued)
- `repair_status` enum (received, assessed, awaiting_approval, in_service,
  waiting_for_parts, quality_check, ready, released, cancelled)
- `certificates` table with piece/client links, verification code, metal/stone/
  weight/dimensions/care fields, and revocation tracking
- `certificate_revisions` table with immutable snapshots per version
- `repair_tickets` table with client/piece links, condition/intake fields,
  estimate/deposit, promised date, custody location, and release acknowledgment
- `repair_events` table for immutable custody trail (status transitions with
  from/to location and actor)

### Phase 3b — Instagram, Events, and Cross-linking (June 27, 2026)

- ✅ Instagram handles on events and clients. Migration `0006_neat_emma` added
  `instagram_handle` to `events` and `event_id` to `projects`. Event form accepts
  Instagram handle; event detail header shows `@handle`. Projects can now link to
  events via Combobox in the create/edit form.
- ✅ Project-event cross-linking. Projects list and detail show event name.
  API endpoints for projects include `eventId`/`eventName` via LEFT JOIN.

### Production Deployment (June 27, 2026)

Deployed to Cloudflare Pages at `https://seine-studio.pages.dev`. Two-user
allowlist: `seinestudio.info@gmail.com` (Owner), `andrelawas35@gmail.com`
(Developer). All database migrations applied. Auth uses Neon Auth email/password
with direct REST API calls (not better-auth React adapter — see
[docs/post-deployment-fixes.md](docs/post-deployment-fixes.md) for details).

`npm run deploy` builds with `VITE_DATA_MODE=api` + `VITE_NEON_AUTH_URL` and
deploys to Cloudflare Pages production.

For the full post-deployment changelog (auth fixes, UI/UX fixes, database fixes,
deployment configuration), see **[docs/post-deployment-fixes.md](docs/post-deployment-fixes.md)**.

## Upgrade Roadmap

The following capabilities are intentionally excluded from the two-user private release but preserved as future upgrades. They should not shape current infrastructure until the owner explicitly enables the corresponding tier.

### Upgrade A - Rich Documents and Delivery

- Branded PDF generation for quotes, invoices, certificates, and repair receipts.
- Automated transactional email delivery and delivery/open history.
- Private attachment storage for receipts, sketches, progress photos, and repair intake images.
- Template approval states and electronic signatures.

### Upgrade B - Client Transactions

- Public quote viewing and acceptance.
- Pay-by-link, deposits, refunds, provider webhooks, and reconciliation.
- Customer portal for approvals, payments, certificates, order progress, and repair status.
- Secure public certificate verification.

### Upgrade C - Team Operations

- Staff, sales, maker, accountant, and read-only roles.
- Granular permission policies and broader audit history.
- Assignment queues, internal comments, and workload reporting.
- Multiple locations, brands, or business entities.

### Upgrade D - Instagram and Marketing Automation

- Meta/Instagram account connection and inbox reading.
- Approved automatic or assisted replies.
- Social scheduling, publishing, engagement analytics, and content calendar.
- Consent-aware campaign and follow-up automation.

### Upgrade E - Commerce and Scale

- Barcode/QR labels and scanning.
- E-commerce, shipping, consignment, and stock synchronization.
- Advanced analytics integrations and forecasting.
- Event organizer integrations, customer lead capture, event sales forecasting, and staff scheduling.
- Native mobile applications only if PWA limitations become measurable.

## Current Codebase Review

### What Exists

- Vite 6, React 18, TypeScript, Tailwind CSS 4, Recharts, Lucide, and Radix/shadcn-style UI dependencies.
- A desktop dashboard with Overview, Projects, Clients, Inventory, and Social Media screens.
- Manila-oriented fixture data and Philippine peso formatting.
- A separate Accounting component with financial overview, invoice, quote, and expense tabs plus in-memory CRUD modals.
- Toast, modal, and confirmation primitives.
- A coherent warm neutral, charcoal, and gold visual foundation.
- The original Seine Studio logo source at `public/brand/seine-logo-source.png`.
- A custom-pricing CSV reference containing eight historical calculation blocks.
- A responsive PWA shell with manifest, service worker, offline/update status, and mobile navigation.
- A tested custom pricing calculator with assisted material suggestions and prefilled quote handoff.
- URL-based navigation with Accounting isolated behind a lazy-loaded route.

### Gaps and Risks

- Most visible screens read module-level constants and are not connected to shared mutable state.
- Most business data is still in memory. Refreshing loses changes outside the Clients vertical slice. The Neon database, server API, Neon Auth sign-in, and two-user allowlist are connected; durable revision history and remaining verticals are Phase 1 work in progress.
- Projects combine production and payment state (`Paid` is a project stage), which will produce ambiguous workflows.
- Client lifetime spend and inventory status are stored values instead of derived results.
- Accounting totals are simplified. Deposits are embedded on invoices, and there is no payment ledger, partial-payment status, tax/discount handling, refund model, or accounting period logic.
- Expenses and inventory purchases are not linked, which can distort cost and profit calculations.
- Global search is currently visual only. The ambiguous global `Create` button has been removed.
- There are no certificates, repairs, catalog-piece records, stock movements, document generation, pay links, or public client workflow.
- Linting, formatting, unit tests, and Playwright browser tests are configured locally; CI is not configured yet.
- Accounting and Reply Templates are lazy-loaded. The initial application chunk is approximately 227 KB minified; Accounting remains approximately 581 KB and needs a measured chart/vendor split before more reporting is added.
- Remote Google Font imports create a network dependency; production should define an intentional font-loading and fallback strategy.
- Current inventory and Accounting records have phone-specific list/detail layouts; future document and repair screens must follow the same pattern.
- IndexedDB drafts now cover Clients, Projects, inventory receipts, and stock-count/movement forms. Conflict-aware queued edits cover Clients and Projects only; retention controls and broader offline workflow coverage remain incomplete.
- A simplified transparent/maskable icon system is implemented; final brand approval remains a pre-release signoff item.
- The pricing tracker has missing inputs, duplicated labels, inconsistent subtotals, and a formula error. The application now stages CSV blocks and surfaces warnings, but the owner must still verify historical source values before saving a version.
- Reply templates work locally, but their custom versions, policy defaults, and optional usage counts are not yet shared across devices or persisted in Neon.
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
- Treat mobile, installed-PWA, intermittent-network, and service-worker-update behavior as testable product requirements.
- Keep offline commands idempotent with client-generated operation IDs and server-side version/conflict checks.

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
- The owner can plan a pop-up, reserve and pack available finished stock, complete opening and closing counts, and reconcile sold, returned, damaged, missing, and transferred pieces without maintaining a separate spreadsheet.
- The owner can issue a professional quote, invoice, and certificate without retyping core data.
- A repair intake cannot be misplaced without a visible custody and status record.
- Revenue collected, outstanding balances, pipeline, gross margin, expenses, and net profit reconcile to their underlying records for any selected period.
- Core records survive reload, are access-controlled, and preserve a meaningful audit history.

## Guidance for Future Agents

Before implementing a request, check it against this document and the existing domain relationships. Favor the smallest coherent vertical workflow over disconnected screens. Preserve the French Minimal / Louvre-inspired system exactly in spirit: architecture, proportion, material, and restraint. When a choice would make the dashboard feel denser, louder, or more generic, choose the calmer jewelry-specific alternative.

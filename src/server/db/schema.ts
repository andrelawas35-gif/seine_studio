import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const appRole = pgEnum("app_role", ["owner", "developer"]);
export const locationType = pgEnum("location_type", ["studio", "storage", "event", "consignment", "client", "other"]);
export const inventoryKind = pgEnum("inventory_kind", ["material", "finished_piece", "packaging", "supply"]);
export const stockMovementType = pgEnum("stock_movement_type", [
  "receipt",
  "reserve",
  "release",
  "transfer",
  "consume",
  "sale",
  "return",
  // Deprecated 2026-06-27: directionless `adjustment` cannot express an increase
  // vs. decrease with a positive-only quantity. Kept as a tombstone (Postgres
  // cannot drop an enum value cheaply); the API now rejects it in favour of the
  // directional types below.
  "adjustment",
  "damage",
  "loss",
  "adjustment_increase",
  "adjustment_decrease",
]);
export const projectStage = pgEnum("project_stage", [
  "inquiry",
  "design",
  "approved",
  "production",
  "quality_control",
  "ready",
  "delivered",
  "cancelled",
  // Added 2026-06-27 — appended (Postgres ADD VALUE appends); logical display
  // order lives in STAGE_ORDER on the client, not in the enum's internal order.
  "consultation",
  "sourcing",
  "closed",
]);
export const eventStage = pgEnum("event_stage", [
  "draft",
  "planning",
  "packing",
  "ready",
  "active",
  "reconciliation",
  "closed",
  "cancelled",
]);
export const taskStatus = pgEnum("task_status", ["not_started", "in_progress", "blocked", "complete"]);
export const allocationStatus = pgEnum("allocation_status", [
  "suggested",
  "reserved",
  "packed",
  "sold",
  "returned",
  "damaged",
  "missing",
  "transferred",
  "cancelled",
]);

// ── Phase 2 finance enums ─────────────────────────────────────────────────

export const quoteStatus = pgEnum("quote_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "converted",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "void",
  "refunded",
]);

export const paymentMethod = pgEnum("payment_method", [
  "bank_transfer",
  "cash",
  "card",
  "gcash",
  "maya",
  "other",
]);

export const expenseCategory = pgEnum("expense_category", [
  "materials",
  "stones",
  "findings",
  "packaging",
  "labor",
  "shipping",
  "rent",
  "utilities",
  "marketing",
  "travel",
  "tools",
  "professional_fees",
  "other_opex",
]);

// ── Phase 3: Certificates and Repairs ────────────────────────────────────

export const certificateStatus = pgEnum("certificate_status", [
  "draft",
  "issued",
  "revoked",
  "reissued",
]);

export const repairStatus = pgEnum("repair_status", [
  "received",
  "assessed",
  "awaiting_approval",
  "in_service",
  "waiting_for_parts",
  "quality_check",
  "ready",
  "released",
  "cancelled",
]);

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: appRole("role").notNull(),
    active: boolean("active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("app_users_auth_user_id_unique").on(table.authUserId),
    uniqueIndex("app_users_email_unique").on(table.email),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    instagramHandle: text("instagram_handle"),
    preferences: text("preferences"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [index("clients_name_idx").on(table.name), index("clients_email_idx").on(table.email)],
);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: locationType("type").notNull(),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const catalogPieces = pgTable(
  "catalog_pieces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    collection: text("collection"),
    metalType: text("metal_type"),
    karat: text("karat"),
    stoneSummary: text("stone_summary"),
    retailPriceCents: bigint("retail_price_cents", { mode: "number" }),
    costCents: bigint("cost_cents", { mode: "number" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("catalog_pieces_sku_unique").on(table.sku), index("catalog_pieces_name_idx").on(table.name)],
);

export const inventoryLots = pgTable(
  "inventory_lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    kind: inventoryKind("kind").notNull(),
    catalogPieceId: uuid("catalog_piece_id").references(() => catalogPieces.id),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    initialQuantity: numeric("initial_quantity", { precision: 18, scale: 4 }).notNull(),
    unitCostCents: bigint("unit_cost_cents", { mode: "number" }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("inventory_lots_code_unique").on(table.code),
    index("inventory_lots_piece_idx").on(table.catalogPieceId),
    check("inventory_lots_initial_quantity_positive", sql`${table.initialQuantity} > 0`),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectNumber: text("project_number").notNull(),
    clientId: uuid("client_id").references(() => clients.id),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    stage: projectStage("stage").notNull().default("inquiry"),
    targetDate: timestamp("target_date", { withTimezone: true }),
    brief: text("brief"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("projects_number_unique").on(table.projectNumber),
    index("projects_client_idx").on(table.clientId),
    index("projects_event_idx").on(table.eventId),
    check(
      "projects_owner_xor",
      sql`(${table.clientId} is not null and ${table.eventId} is null) or (${table.clientId} is null and ${table.eventId} is not null)`,
    ),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    stage: eventStage("stage").notNull().default("draft"),
    organizer: text("organizer"),
    venue: text("venue"),
    instagramHandle: text("instagram_handle"),
    locationId: uuid("location_id").references(() => locations.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    revenueTargetCents: bigint("revenue_target_cents", { mode: "number" }),
    budgetCents: bigint("budget_cents", { mode: "number" }),
    studioBufferPercent: integer("studio_buffer_percent").notNull().default(0),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("events_dates_idx").on(table.startsAt, table.endsAt),
    check("events_valid_date_range", sql`${table.endsAt} >= ${table.startsAt}`),
    check("events_buffer_range", sql`${table.studioBufferPercent} between 0 and 100`),
    check(
      "events_revenue_target_nonnegative",
      sql`${table.revenueTargetCents} is null or ${table.revenueTargetCents} >= 0`,
    ),
    check("events_budget_nonnegative", sql`${table.budgetCents} is null or ${table.budgetCents} >= 0`),
    index("events_instagram_idx").on(table.instagramHandle),
  ],
);

export const eventTasks = pgTable(
  "event_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: taskStatus("status").notNull().default("not_started"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    assigneeId: uuid("assignee_id").references(() => appUsers.id),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("event_tasks_event_idx").on(table.eventId)],
);

export const eventInventoryAllocations = pgTable(
  "event_inventory_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    inventoryLotId: uuid("inventory_lot_id")
      .notNull()
      .references(() => inventoryLots.id),
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id),
    plannedQuantity: numeric("planned_quantity", { precision: 18, scale: 4 }).notNull(),
    openingQuantity: numeric("opening_quantity", { precision: 18, scale: 4 }),
    closingQuantity: numeric("closing_quantity", { precision: 18, scale: 4 }),
    status: allocationStatus("status").notNull().default("suggested"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("event_inventory_allocation_unique").on(table.eventId, table.inventoryLotId, table.sourceLocationId),
    index("event_inventory_lot_idx").on(table.inventoryLotId),
    check("event_allocation_planned_quantity_positive", sql`${table.plannedQuantity} > 0`),
  ],
);

export const eventBudgetLines = pgTable(
  "event_budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    description: text("description").notNull(),
    plannedAmountCents: bigint("planned_amount_cents", { mode: "number" }).notNull(),
    actualExpenseId: uuid("actual_expense_id"),
    ...timestamps,
  },
  (table) => [check("event_budget_line_amount_nonnegative", sql`${table.plannedAmountCents} >= 0`)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryLotId: uuid("inventory_lot_id")
      .notNull()
      .references(() => inventoryLots.id),
    type: stockMovementType("type").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    fromLocationId: uuid("from_location_id").references(() => locations.id),
    toLocationId: uuid("to_location_id").references(() => locations.id),
    projectId: uuid("project_id").references(() => projects.id),
    eventId: uuid("event_id").references(() => events.id),
    reason: text("reason").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_movements_lot_time_idx").on(table.inventoryLotId, table.occurredAt),
    check("stock_movements_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "stock_movements_location_present",
      sql`${table.fromLocationId} is not null or ${table.toLocationId} is not null`,
    ),
  ],
);

export const pricingCalculations = pgTable("pricing_calculations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  projectId: uuid("project_id").references(() => projects.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUsers.id),
  ...timestamps,
});

export const pricingVersions = pgTable(
  "pricing_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calculationId: uuid("calculation_id")
      .notNull()
      .references(() => pricingCalculations.id),
    version: integer("version").notNull(),
    currency: text("currency").notNull().default("PHP"),
    inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull(),
    costLines: jsonb("cost_lines").$type<Array<Record<string, unknown>>>().notNull(),
    totalCostCents: bigint("total_cost_cents", { mode: "number" }).notNull(),
    suggestedPriceCents: bigint("suggested_price_cents", { mode: "number" }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pricing_versions_number_unique").on(table.calculationId, table.version),
    check("pricing_versions_version_positive", sql`${table.version} > 0`),
    check("pricing_versions_total_cost_nonnegative", sql`${table.totalCostCents} >= 0`),
    check("pricing_versions_suggested_price_nonnegative", sql`${table.suggestedPriceCents} >= 0`),
  ],
);

export const replyTemplates = pgTable("reply_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
});

export const replyTemplateVersions = pgTable(
  "reply_template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => replyTemplates.id),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    variables: jsonb("variables").$type<string[]>().notNull().default([]),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reply_template_versions_number_unique").on(table.templateId, table.version)],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => appUsers.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    summary: text("summary").notNull(),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_entity_idx").on(table.entityType, table.entityId),
    index("activity_created_idx").on(table.createdAt),
  ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

// ── Phase 2: Quotes ──────────────────────────────────────────────────────

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteNumber: text("quote_number").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    projectId: uuid("project_id").references(() => projects.id),
    pricingVersionId: uuid("pricing_version_id").references(() => pricingVersions.id),
    status: quoteStatus("status").notNull().default("draft"),
    depositPercent: integer("deposit_percent"),
    terms: text("terms"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("quotes_number_unique").on(table.quoteNumber),
    index("quotes_client_idx").on(table.clientId),
    index("quotes_project_idx").on(table.projectId),
  ],
);

export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id),
    version: integer("version").notNull(),
    /** Immutable pricing snapshot — never altered by later rate changes */
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("quote_versions_number_unique").on(table.quoteId, table.version)],
);

// ── Phase 2: Invoices ────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceNumber: text("invoice_number").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    projectId: uuid("project_id").references(() => projects.id),
    quoteId: uuid("quote_id").references(() => quotes.id),
    status: invoiceStatus("status").notNull().default("draft"),
    currency: text("currency").notNull().default("PHP"),
    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull(),
    discountCents: bigint("discount_cents", { mode: "number" }).notNull().default(0),
    taxCents: bigint("tax_cents", { mode: "number" }).notNull().default(0),
    totalCents: bigint("total_cents", { mode: "number" }).notNull(),
    paidCents: bigint("paid_cents", { mode: "number" }).notNull().default(0),
    depositPercent: integer("deposit_percent"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    notes: text("notes"),
    /** Immutable snapshot of line items at finalization */
    lineItemsSnapshot: jsonb("line_items_snapshot").$type<Array<Record<string, unknown>>>(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invoices_number_unique").on(table.invoiceNumber),
    index("invoices_client_idx").on(table.clientId),
    index("invoices_status_idx").on(table.status),
    check("invoices_total_nonnegative", sql`${table.totalCents} >= 0`),
    check("invoices_paid_nonnegative", sql`${table.paidCents} >= 0`),
  ],
);

// ── Phase 2: Payments ────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    method: paymentMethod("method").notNull(),
    externalReference: text("external_reference"),
    feesCents: bigint("fees_cents", { mode: "number" }).notNull().default(0),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [
    index("payments_invoice_idx").on(table.invoiceId),
    check("payments_amount_positive", sql`${table.amountCents} > 0`),
  ],
);

// ── Phase 2: Suppliers ───────────────────────────────────────────────────

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    category: text("category"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("suppliers_name_idx").on(table.name)],
);

// ── Phase 2: Expenses ────────────────────────────────────────────────────

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    projectId: uuid("project_id").references(() => projects.id),
    eventId: uuid("event_id").references(() => events.id),
    category: expenseCategory("category").notNull(),
    description: text("description").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    method: paymentMethod("method"),
    receiptUrl: text("receipt_url"),
    incurredAt: timestamp("incurred_at", { withTimezone: true }).notNull(),
    isCogs: boolean("is_cogs").notNull().default(false),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [
    index("expenses_supplier_idx").on(table.supplierId),
    index("expenses_project_idx").on(table.projectId),
    index("expenses_category_idx").on(table.category),
    check("expenses_amount_positive", sql`${table.amountCents} > 0`),
  ],
);

// ── Phase 3: Certificates ────────────────────────────────────────────────

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    certificateNumber: text("certificate_number").notNull(),
    catalogPieceId: uuid("catalog_piece_id").references(() => catalogPieces.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    status: certificateStatus("status").notNull().default("draft"),
    pieceName: text("piece_name").notNull(),
    metalType: text("metal_type"),
    karat: text("karat"),
    stoneSpecifications: text("stone_specifications"),
    weightGrams: numeric("weight_grams", { precision: 10, scale: 3 }),
    dimensions: text("dimensions"),
    completionDate: timestamp("completion_date", { withTimezone: true }),
    careGuidance: text("care_guidance"),
    signatory: text("signatory"),
    verificationCode: text("verification_code").notNull(),
    revokedReason: text("revoked_reason"),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("certificates_number_unique").on(table.certificateNumber),
    uniqueIndex("certificates_verification_unique").on(table.verificationCode),
    index("certificates_piece_idx").on(table.catalogPieceId),
    index("certificates_client_idx").on(table.clientId),
  ],
);

export const certificateRevisions = pgTable(
  "certificate_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    certificateId: uuid("certificate_id")
      .notNull()
      .references(() => certificates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Immutable snapshot of issued certificate data */
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    reason: text("reason"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("certificate_revisions_version_unique").on(table.certificateId, table.version)],
);

// ── Phase 3: Repair Tickets ──────────────────────────────────────────────

export const repairTickets = pgTable(
  "repair_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNumber: text("ticket_number").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    catalogPieceId: uuid("catalog_piece_id").references(() => catalogPieces.id, { onDelete: "set null" }),
    pieceDescription: text("piece_description").notNull(),
    identifyingMarks: text("identifying_marks"),
    photosUrls: jsonb("photos_urls").$type<string[]>().notNull().default([]),
    receivedCondition: text("received_condition"),
    includedAccessories: text("included_accessories"),
    requestedWork: text("requested_work").notNull(),
    estimateCents: bigint("estimate_cents", { mode: "number" }),
    depositCents: bigint("deposit_cents", { mode: "number" }).notNull().default(0),
    promisedDate: timestamp("promised_date", { withTimezone: true }),
    status: repairStatus("status").notNull().default("received"),
    currentLocationId: uuid("current_location_id").references(() => locations.id, { onDelete: "set null" }),
    releaseAcknowledgment: text("release_acknowledgment"),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("repair_tickets_number_unique").on(table.ticketNumber),
    index("repair_tickets_status_idx").on(table.status),
    index("repair_tickets_client_idx").on(table.clientId),
    check(
      "repair_tickets_estimate_nonnegative",
      sql`${table.estimateCents} is null or ${table.estimateCents} >= 0`,
    ),
    check("repair_tickets_deposit_nonnegative", sql`${table.depositCents} >= 0`),
  ],
);

export const repairEvents = pgTable(
  "repair_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repairTicketId: uuid("repair_ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    summary: text("summary").notNull(),
    fromStatus: repairStatus("from_status"),
    toStatus: repairStatus("to_status"),
    fromLocationId: uuid("from_location_id").references(() => locations.id, { onDelete: "set null" }),
    toLocationId: uuid("to_location_id").references(() => locations.id, { onDelete: "set null" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => appUsers.id),
    notes: text("notes"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("repair_events_ticket_idx").on(table.repairTicketId)],
);

// ── Phase 3: Push Notification Subscriptions ────────────────────────────

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dhKey: text("p256dh_key").notNull(),
    authKey: text("auth_key").notNull(),
    dailyReminder: boolean("daily_reminder").notNull().default(false),
    reminderHour: integer("reminder_hour").notNull().default(9),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    index("push_subscriptions_user_idx").on(table.userId),
    check(
      "push_subscriptions_reminder_hour_range",
      sql`${table.reminderHour} between 0 and 23`,
    ),
  ],
);

// ── Wave 2: Cost type enum (closed — matches E3's PricingLineCategory exactly) ──
// Controller-enforced parity with src/app/pricing.ts PricingLineCategory union.
export const costType = pgEnum("cost_type", [
  "material",
  "labor",
  "design",
  "packaging",
  "outsourced",
  "overhead",
  "other",
  "stones_gemstones",
  "metal_findings",
  "finishing_plating",
  "setting_engraving",
]);

// ── Settings (tunable parameters — ADR-0003) ────────────────────────────────

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => appUsers.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("settings_key_unique").on(table.key)],
);

// ── Cost Catalog (reusable cost lines — ADR-0003) ───────────────────────────

export const costCatalog = pgTable(
  "cost_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    costType: costType("cost_type").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    unitCostCents: bigint("unit_cost_cents", { mode: "number" }).notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cost_catalog_type_idx").on(table.costType),
    check("cost_catalog_unit_cost_nonnegative", sql`${table.unitCostCents} >= 0`),
  ],
);

// ── Event Price List (event-specific pricing) ──────────────────────────────

export const eventPriceList = pgTable(
  "event_price_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    catalogPieceId: uuid("catalog_piece_id")
      .notNull()
      .references(() => catalogPieces.id),
    priceCents: bigint("price_cents", { mode: "number" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_price_list_unique").on(table.eventId, table.catalogPieceId),
    index("event_price_list_event_idx").on(table.eventId),
    check("event_price_list_price_nonnegative", sql`${table.priceCents} >= 0`),
  ],
);

// ── Consignment (long-lived partner shop — ADR-0004) ─────────────────────

export const consignments = pgTable(
  "consignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("consignments_name_idx").on(table.name)],
);

export const consignmentCounts = pgTable(
  "consignment_counts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consignmentId: uuid("consignment_id")
      .notNull()
      .references(() => consignments.id, { onDelete: "cascade" }),
    countedAt: timestamp("counted_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("consignment_counts_consignment_time_idx").on(table.consignmentId, table.countedAt)],
);

export const consignmentCountItems = pgTable(
  "consignment_count_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consignmentCountId: uuid("consignment_count_id")
      .notNull()
      .references(() => consignmentCounts.id, { onDelete: "cascade" }),
    inventoryLotId: uuid("inventory_lot_id")
      .notNull()
      .references(() => inventoryLots.id),
    countedQuantity: numeric("counted_quantity", { precision: 18, scale: 4 }).notNull(),
    expectedQuantity: numeric("expected_quantity", { precision: 18, scale: 4 }),
    discrepancyNote: text("discrepancy_note"),
  },
  (table) => [
    uniqueIndex("consignment_count_items_unique").on(table.consignmentCountId, table.inventoryLotId),
    check("consignment_count_items_quantity_nonnegative", sql`${table.countedQuantity} >= 0`),
  ],
);

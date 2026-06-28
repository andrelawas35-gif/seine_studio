import { describe, expect, it } from "vitest";
import {
  daysBetween,
  dueSoonProjects,
  expiringQuotes,
  lowStock,
  manilaToday,
  overdueInvoices,
  overdueProjects,
  pastPromiseRepairs,
  rankAttention,
  toManilaDate,
  type InvoiceLike,
  type ProjectLike,
  type QuoteLike,
  type RepairLike,
  type StockLike,
} from "./signals";

const TODAY = "2026-06-28";

describe("manila date helpers", () => {
  it("daysBetween is date-only and signed", () => {
    expect(daysBetween("2026-06-28", "2026-07-05")).toBe(7);
    expect(daysBetween("2026-06-28", "2026-06-21")).toBe(-7);
    expect(daysBetween("2026-06-28", "2026-06-28")).toBe(0);
  });

  it("toManilaDate shifts a UTC instant into the Manila calendar day", () => {
    // 2026-06-28T22:00Z is already 2026-06-29 06:00 in Manila (UTC+8).
    expect(toManilaDate("2026-06-28T22:00:00Z")).toBe("2026-06-29");
    // 2026-06-28T15:00Z is 2026-06-28 23:00 in Manila — still the 28th.
    expect(toManilaDate("2026-06-28T15:00:00Z")).toBe("2026-06-28");
  });

  it("manilaToday returns an ISO calendar date", () => {
    expect(manilaToday(new Date("2026-06-28T04:00:00Z"))).toBe("2026-06-28");
  });
});

describe("overdueInvoices", () => {
  const invoices: InvoiceLike[] = [
    { id: "a", status: "sent", dueDate: "2026-06-20" }, // overdue
    { id: "b", status: "sent", dueDate: "2026-07-10" }, // future
    { id: "c", status: "paid", dueDate: "2026-06-01" }, // paid → ignored
    { id: "d", status: "void", dueDate: "2026-06-01" }, // void → ignored
    { id: "e", status: "sent", dueDate: null }, // no due date → ignored
  ];
  it("flags only unpaid, past-due invoices", () => {
    expect(overdueInvoices(invoices, TODAY).map((i) => i.id)).toEqual(["a"]);
  });
});

describe("expiringQuotes", () => {
  const quotes: QuoteLike[] = [
    { id: "a", status: "sent", expiresAt: "2026-07-02" }, // within 7d
    { id: "b", status: "viewed", expiresAt: "2026-06-28" }, // today (0d)
    { id: "c", status: "sent", expiresAt: "2026-07-20" }, // too far
    { id: "d", status: "accepted", expiresAt: "2026-07-01" }, // not open → ignored
    { id: "e", status: "sent", expiresAt: "2026-06-20" }, // already past → ignored
  ];
  it("flags open quotes expiring within the window", () => {
    expect(expiringQuotes(quotes, TODAY).map((q) => q.id).sort()).toEqual(["a", "b"]);
  });
});

describe("project deadlines", () => {
  const projects: ProjectLike[] = [
    { id: "a", title: "A", stage: "production", targetDate: "2026-06-20" }, // overdue
    { id: "b", title: "B", stage: "design", targetDate: "2026-07-01" }, // due soon
    { id: "c", title: "C", stage: "delivered", targetDate: "2026-06-20" }, // terminal → ignored
    { id: "d", title: "D", stage: "production", targetDate: "2026-08-01" }, // far future
  ];
  it("overdueProjects excludes terminal stages", () => {
    expect(overdueProjects(projects, TODAY).map((p) => p.id)).toEqual(["a"]);
  });
  it("dueSoonProjects flags active projects within the window", () => {
    expect(dueSoonProjects(projects, TODAY).map((p) => p.id)).toEqual(["b"]);
  });
});

describe("pastPromiseRepairs", () => {
  const repairs: RepairLike[] = [
    { id: "a", status: "in_progress", promisedDate: "2026-06-20" }, // overdue
    { id: "b", status: "released", promisedDate: "2026-06-20" }, // closed → ignored
    { id: "c", status: "in_progress", promisedDate: "2026-07-10" }, // future
  ];
  it("flags only open, past-promise repairs", () => {
    expect(pastPromiseRepairs(repairs, TODAY).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("lowStock", () => {
  const items: StockLike[] = [
    { id: "a", onHand: 2, reorderLevel: 5 }, // low
    { id: "b", onHand: 5, reorderLevel: 5 }, // at threshold → low
    { id: "c", onHand: 9, reorderLevel: 5 }, // fine
    { id: "d", onHand: 0, reorderLevel: 0 }, // no threshold set → ignored
  ];
  it("flags items at or below a real reorder level", () => {
    expect(lowStock(items).map((i) => i.id).sort()).toEqual(["a", "b"]);
  });
});

describe("rankAttention", () => {
  it("ranks red (overdue) before amber (soon) and is sorted", () => {
    const items = rankAttention(
      {
        invoices: [{ id: "i1", clientName: "Maria", status: "sent", dueDate: "2026-06-10" }],
        projects: [
          { id: "p1", title: "Ring", stage: "production", targetDate: "2026-06-25" }, // overdue (red)
          { id: "p2", title: "Necklace", stage: "design", targetDate: "2026-07-01" }, // soon (amber)
        ],
        quotes: [{ id: "q1", clientName: "Ana", status: "sent", expiresAt: "2026-07-02" }],
        stock: [{ id: "s1", label: "Gold wire", onHand: 1, reorderLevel: 5 }],
      },
      TODAY,
    );

    // All red items come before all amber items.
    const severities = items.map((i) => i.severity);
    const firstAmber = severities.indexOf("amber");
    expect(severities.slice(0, firstAmber).every((s) => s === "red")).toBe(true);
    expect(severities.slice(firstAmber).every((s) => s === "amber")).toBe(true);

    // Items are action-framed and carry deep links.
    expect(items[0].label).toMatch(/overdue|past/i);
    expect(items.every((i) => i.href.startsWith("/"))).toBe(true);
  });

  it("returns an empty list when nothing needs attention", () => {
    expect(rankAttention({}, TODAY)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { calculatePricing, pesosToCentavos, type PricingLine } from "./pricing";

const line = (
  id: string,
  category: PricingLine["category"],
  quantity: number,
  unitCostPesos: number,
): PricingLine => ({
  id,
  category,
  description: id,
  quantity,
  unit: category === "labor" ? "hour" : "piece",
  unitCostCentavos: pesosToCentavos(unitCostPesos),
});

describe("calculatePricing", () => {
  it("reproduces the Carlo tracker calculation from canonical inputs", () => {
    const totals = calculatePricing({
      lines: [
        line("materials", "material", 1, 939.5),
        line("labor", "labor", 5, 500),
        line("design", "design", 1, 100),
      ],
      markup: { type: "fixed", amountCentavos: pesosToCentavos(1700) },
      discountCentavos: 0,
    });

    expect(totals.netCapitalCentavos).toBe(353_950);
    expect(totals.sellingPriceCentavos).toBe(523_950);
    expect(totals.grossProfitCentavos).toBe(170_000);
    expect(totals.grossMarginBasisPoints).toBe(3245);
  });

  it("does not inherit the inconsistent displayed Niqui total", () => {
    const totals = calculatePricing({
      lines: [
        line("materials", "material", 1, 966),
        line("labor", "labor", 4, 500),
        line("design", "design", 1, 800),
      ],
      markup: { type: "fixed", amountCentavos: pesosToCentavos(1700) },
      discountCentavos: 0,
    });

    expect(totals.netCapitalCentavos).toBe(376_600);
    expect(totals.sellingPriceCentavos).toBe(546_600);
    expect(totals.sellingPriceCentavos).not.toBe(pesosToCentavos(4000));
  });

  it("calculates percentage markup in basis points", () => {
    const totals = calculatePricing({
      lines: [line("materials", "material", 1, 1000)],
      markup: { type: "percentage", basisPoints: 2500 },
      discountCentavos: pesosToCentavos(50),
    });

    expect(totals.markupCentavos).toBe(25_000);
    expect(totals.sellingPriceCentavos).toBe(120_000);
    expect(totals.grossProfitCentavos).toBe(20_000);
  });

  it("preserves a manual selling-price override separately from the suggestion", () => {
    const totals = calculatePricing({
      lines: [line("materials", "material", 1, 2400)],
      markup: { type: "fixed", amountCentavos: 0 },
      discountCentavos: 0,
      sellingPriceOverrideCentavos: pesosToCentavos(3000),
    });

    expect(totals.suggestedPriceCentavos).toBe(240_000);
    expect(totals.sellingPriceCentavos).toBe(300_000);
    expect(totals.grossProfitCentavos).toBe(60_000);
  });
});

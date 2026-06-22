export type PricingLineCategory =
  | "material"
  | "labor"
  | "design"
  | "packaging"
  | "outsourced"
  | "overhead"
  | "other";

export interface PricingLine {
  id: string;
  category: PricingLineCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCostCentavos: number;
}

export type PricingMarkup =
  | { type: "fixed"; amountCentavos: number }
  | { type: "percentage"; basisPoints: number };

export interface PricingInput {
  lines: PricingLine[];
  markup: PricingMarkup;
  discountCentavos: number;
  sellingPriceOverrideCentavos?: number;
}

export interface PricingTotals {
  materialCostCentavos: number;
  laborCostCentavos: number;
  designCostCentavos: number;
  otherDirectCostCentavos: number;
  netCapitalCentavos: number;
  markupCentavos: number;
  discountCentavos: number;
  suggestedPriceCentavos: number;
  sellingPriceCentavos: number;
  grossProfitCentavos: number;
  grossMarginBasisPoints: number;
}

export const pesosToCentavos = (pesos: number) => Math.round((Number.isFinite(pesos) ? pesos : 0) * 100);
export const centavosToPesos = (centavos: number) => centavos / 100;

export const lineTotalCentavos = (line: PricingLine) =>
  Math.max(0, Math.round(Math.max(0, line.quantity) * Math.max(0, line.unitCostCentavos)));

export function calculatePricing(input: PricingInput): PricingTotals {
  const totals = input.lines.reduce(
    (sum, line) => {
      const amount = lineTotalCentavos(line);
      if (line.category === "material" || line.category === "packaging") sum.material += amount;
      else if (line.category === "labor") sum.labor += amount;
      else if (line.category === "design") sum.design += amount;
      else sum.other += amount;
      return sum;
    },
    { material: 0, labor: 0, design: 0, other: 0 },
  );

  const netCapital = totals.material + totals.labor + totals.design + totals.other;
  const markup = input.markup.type === "fixed"
    ? Math.max(0, Math.round(input.markup.amountCentavos))
    : Math.max(0, Math.round((netCapital * Math.max(0, input.markup.basisPoints)) / 10_000));
  const discount = Math.max(0, Math.round(input.discountCentavos));
  const suggestedPrice = Math.max(0, netCapital + markup - discount);
  const sellingPrice = input.sellingPriceOverrideCentavos === undefined
    ? suggestedPrice
    : Math.max(0, Math.round(input.sellingPriceOverrideCentavos));
  const grossProfit = sellingPrice - netCapital;
  const grossMarginBasisPoints = sellingPrice === 0
    ? 0
    : Math.round((grossProfit * 10_000) / sellingPrice);

  return {
    materialCostCentavos: totals.material,
    laborCostCentavos: totals.labor,
    designCostCentavos: totals.design,
    otherDirectCostCentavos: totals.other,
    netCapitalCentavos: netCapital,
    markupCentavos: markup,
    discountCentavos: discount,
    suggestedPriceCentavos: suggestedPrice,
    sellingPriceCentavos: sellingPrice,
    grossProfitCentavos: grossProfit,
    grossMarginBasisPoints,
  };
}

export function pricingWarnings(input: PricingInput, totals: PricingTotals) {
  const warnings: string[] = [];
  if (input.lines.some((line) => !line.description.trim())) warnings.push("A cost line is missing a description.");
  if (input.lines.some((line) => line.quantity <= 0)) warnings.push("A cost line has zero quantity.");
  if (input.lines.some((line) => line.unitCostCentavos <= 0)) warnings.push("A cost line is missing its unit cost.");
  if (totals.grossProfitCentavos < 0) warnings.push("Selling price is below net capital.");
  else if (totals.grossProfitCentavos === 0) warnings.push("This price has no gross profit.");
  if (input.sellingPriceOverrideCentavos !== undefined && totals.sellingPriceCentavos !== totals.suggestedPriceCentavos) {
    warnings.push("Selling price manually overrides the calculated suggestion.");
  }
  return warnings;
}

export const formatCentavos = (centavos: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: Number.isInteger(centavos / 100) ? 0 : 2,
  }).format(centavos / 100);

import Papa from "papaparse";
import type { PricingInput, PricingLine } from "./pricing";

export interface PricingVersion {
  id: string;
  version: number;
  pieceName: string;
  projectId: string;
  clientName: string;
  createdAt: string;
  input: PricingInput;
}

export interface TrackerBlock {
  id: string;
  name: string;
  lines: PricingLine[];
  markupPesos: number;
  displayedTotalPesos?: number;
  warnings: string[];
}

const numeric = (value: string | undefined) => {
  const cleaned = (value || "").replace(/[₱,\s]/g, "");
  if (!cleaned || !Number.isFinite(Number(cleaned))) return undefined;
  return Number(cleaned);
};

export function createPricingVersion(
  existing: PricingVersion[],
  snapshot: Omit<PricingVersion, "id" | "version" | "createdAt">,
  now = new Date(),
): PricingVersion {
  const family = existing.filter((version) => version.projectId === snapshot.projectId && version.pieceName === snapshot.pieceName);
  return {
    id: globalThis.crypto?.randomUUID?.() || `pricing-${now.getTime()}-${existing.length + 1}`,
    version: Math.max(0, ...family.map((item) => item.version)) + 1,
    createdAt: now.toISOString(),
    ...structuredClone(snapshot),
  };
}

export function parseTrackerCsv(csv: string): TrackerBlock[] {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = parsed.data;
  const starts = rows.reduce<number[]>((indexes, row, index) => {
    if ((row[0] || "").trim() === "Item / Task") indexes.push(index);
    return indexes;
  }, []);

  return starts.map((start, blockIndex) => {
    const end = starts[blockIndex + 1] ?? rows.length;
    const blockRows = rows.slice(start, end);
    const previous = rows.slice(Math.max(0, start - 3), start).reverse().find((row) => row.some((cell) => cell.trim()));
    const name = (rows[start][5] || previous?.[0] || previous?.[5] || `Pricing block ${blockIndex + 1}`).trim();
    const warnings: string[] = [];
    const lines: PricingLine[] = [];
    let markupPesos = 0;
    let displayedTotalPesos: number | undefined;

    for (const [rowIndex, row] of blockRows.entries()) {
      const label = (row[0] || "").trim();
      if (label === "Labor (hours)" || label === "Design Fee") {
        const quantity = numeric(row[1]);
        const unitCost = numeric(row[2]);
        if (quantity === undefined || unitCost === undefined) warnings.push(`${label} has a missing or invalid value.`);
        lines.push({ id: `import-${blockIndex}-${rowIndex}`, category: label.startsWith("Labor") ? "labor" : "design", description: label, quantity: quantity || 0, unit: label.startsWith("Labor") ? "hour" : "fee", unitCostCentavos: Math.round((unitCost || 0) * 100) });
      }
      if (label === "Brand Value Markup") markupPesos = numeric(row[2]) ?? numeric(row[3]) ?? 0;
      if ((row[2] || "").trim() === "TOTAL PRICE") displayedTotalPesos = numeric(row[3]);

      const materialName = (row[5] || "").trim();
      if (materialName && !["Materials", name].includes(materialName)) {
        const unitCost = numeric(row[7]);
        const quantity = numeric(row[8]);
        const displayed = numeric(row[9]);
        if (row[9]?.includes("#")) warnings.push(`${materialName} contains ${row[9]} and needs a corrected total.`);
        if (unitCost === undefined || quantity === undefined) warnings.push(`${materialName} has a missing price or quantity.`);
        if (unitCost !== undefined && quantity !== undefined && displayed !== undefined && Math.abs(unitCost * quantity - displayed) > 0.01) {
          warnings.push(`${materialName} total does not equal price × quantity.`);
        }
        lines.push({ id: `import-material-${blockIndex}-${rowIndex}`, category: materialName === "Packaging" || materialName === "Polishing Cloth" ? "packaging" : "material", description: materialName, quantity: quantity || 0, unit: "piece", unitCostCentavos: Math.round((unitCost || 0) * 100) });
      }
    }

    if (!lines.length) warnings.push("No usable cost lines were found.");
    if (parsed.errors.length) warnings.push("The CSV contains malformed rows; verify the source formatting.");
    return { id: `tracker-block-${blockIndex + 1}`, name, lines, markupPesos, displayedTotalPesos, warnings: [...new Set(warnings)] };
  });
}

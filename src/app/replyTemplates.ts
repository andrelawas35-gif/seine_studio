export type ReplyCategory =
  | "Pricing"
  | "Custom orders"
  | "Payments"
  | "Materials"
  | "Lead times"
  | "Delivery"
  | "Aftercare"
  | "Availability";

export interface ReplyTemplate {
  id: string;
  title: string;
  category: ReplyCategory;
  body: string;
  version: number;
  builtIn: boolean;
  updatedAt: string;
}

export type ReplyVariables = Record<string, string>;

export const APPROVED_VARIABLES = [
  "client_name",
  "piece_type",
  "starting_price",
  "deposit_percentage",
  "lead_time",
  "material",
  "pickup_location",
] as const;

export const DEFAULT_STUDIO_POLICIES: ReplyVariables = {
  deposit_percentage: "50%",
  lead_time: "4-6 weeks",
  pickup_location: "Manila",
};

export const DEFAULT_REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: "pricing-start",
    title: "Starting price",
    category: "Pricing",
    body: "Hi {{client_name}}, thank you for reaching out to Seine Studio. Our custom {{piece_type}} pieces start at {{starting_price}}. The final price depends on the material, stones, size, and design details. May we know your preferred style and budget?",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "custom-process",
    title: "Custom-order process",
    category: "Custom orders",
    body: "Hi {{client_name}}. We begin with your inspiration, measurements, material, and budget, then prepare a design and quote for your review. Production starts after approval and the {{deposit_percentage}} deposit. The usual lead time is {{lead_time}}.",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "deposit",
    title: "Deposit and payment",
    category: "Payments",
    body: "A {{deposit_percentage}} deposit confirms the design and production slot. The remaining balance is due before pickup or delivery. We will send the complete payment details with your approved quote.",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "materials",
    title: "Materials and customization",
    category: "Materials",
    body: "This design can be made in {{material}} and adjusted to your preferred size or stone. Tell us which details you would like to keep or change, and we will confirm availability and pricing.",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "lead-time",
    title: "Lead time",
    category: "Lead times",
    body: "Our current production lead time is {{lead_time}} after design approval and deposit. If you have an important date, please share it with us so we can check the workshop schedule before confirming.",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "pickup-delivery",
    title: "Pickup or delivery",
    category: "Delivery",
    body: "Your piece may be collected in {{pickup_location}} or arranged for delivery. We will confirm the handoff method and any delivery fee before the final balance is paid.",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "care",
    title: "Jewelry care",
    category: "Aftercare",
    body: "Keep your piece dry and store it separately in its pouch. Avoid perfume, chemicals, and impact. After wearing, wipe it gently with a soft cloth. Message us if you would like Seine Studio to assess it for cleaning or repair.",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
  {
    id: "availability",
    title: "Availability or restock",
    category: "Availability",
    body: "Thank you for asking about the {{piece_type}}. We will check current availability and material stock, then reply with the price and earliest completion date. Would you like us to reserve one once confirmed?",
    version: 1,
    builtIn: true,
    updatedAt: "2026-06-21",
  },
];

export function extractTemplateVariables(body: string): string[] {
  const variables = Array.from(body.matchAll(/{{\s*([a-z0-9_]+)\s*}}/gi), (match) => match[1].toLowerCase());
  return [...new Set(variables)];
}

export function renderReplyTemplate(body: string, variables: ReplyVariables) {
  const usedVariables = extractTemplateVariables(body);
  const missingVariables = usedVariables.filter((name) => !variables[name]?.trim());
  const text = body.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_, rawName: string) => {
    const name = rawName.toLowerCase();
    return variables[name]?.trim() || `[${name.replaceAll("_", " ")} needed]`;
  });

  return { text, usedVariables, missingVariables };
}

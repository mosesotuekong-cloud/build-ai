// The product name lives here and only here. Rename the product by changing this file.
export const APP_NAME = "Builda";
export const APP_TAGLINE = "Spot the work a machine should be doing.";
export const DEFAULT_COUNTRY = "Nigeria";
export const DEFAULT_CURRENCY_SYMBOL = "₦";

// The business functions a deck can cover. Mirrors the seeded `functions` table.
export const FUNCTIONS = [
  { slug: "hr", name: "HR" },
  { slug: "finance", name: "Finance" },
  { slug: "sales", name: "Sales" },
  { slug: "procurement", name: "Procurement" },
  { slug: "operations", name: "Operations" },
  { slug: "customer-service", name: "Customer Service" },
  { slug: "it", name: "IT" },
] as const;

export type FunctionSlug = (typeof FUNCTIONS)[number]["slug"];

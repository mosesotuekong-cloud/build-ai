import type { BusinessInputs } from "./business";
import type { Challenge, DiscoveryDesign, Rank, Setup } from "./model";

// The worked example: the payment-proof checker, ready to play in one
// click. Used for demos (investors, workshops, sales calls), so every run
// tells the same story; the AI still builds the workflow live. Matches the
// "Builda demo script: payment proof checker" document.

export const DEMO_SETUP: Setup = {
  function_slug: "finance",
  players: 3,
  player_names: ["Amaka", "Tunde", "Grace"],
  stack: ["n8n", "zoho"],
  region: "nigeria",
};

export const DEMO_CHALLENGE: Challenge = {
  title: "Screenshots that look paid",
  story:
    "Customers send bank transfer screenshots by WhatsApp or Gmail after receiving a pro forma invoice. Sales admin checks the screenshot, asks finance to confirm the credit, then marks the order as ready in Zoho CRM or Excel. One Friday, a fake-looking screenshot was treated as paid until finance checked the bank statement after the truck had already been loaded.",
  cost: "About 3 hours a day of sales admin and finance time, slow dispatch while orders wait for confirmation, and one near-miss on a ₦4.5m order released on a fake screenshot.",
  who_feels_it: "Sales admin, finance officer, warehouse supervisor, drivers, customers waiting for delivery",
  source: "own",
};

export const DEMO_DESIGN: DiscoveryDesign = {
  fix: {
    eliminate: "Treating a screenshot as proof of payment.",
    combine: "One company WhatsApp Business number and one payments@ inbox, instead of personal phones and emails.",
    simplify: "Put a unique payment reference on every pro forma invoice.",
  },
  trigger: "A customer sends payment proof (a screenshot or PDF) to the payments WhatsApp number or payments@ inbox, or the bank's credit alert email arrives.",
  steps: "Read the screenshot: amount, date, sender name, bank and payment reference. Find the pro forma invoice in Zoho CRM by reference or customer. Check today's bank credits from the credit alert emails or the daily statement export.",
  decision: "Rule: mark it paid only when a matching credit is in the bank, same amount (within ₦100) and the invoice reference. AI reads the screenshot and flags mismatches or signs of editing, but never approves a payment from a screenshot alone.",
  action: "Set the Zoho deal to Payment confirmed, tell sales admin and the warehouse on WhatsApp that the order can be loaded, and reply to the customer with the dispatch time. If there is no match yet, tell the customer we are confirming with the bank and alert finance.",
  human: "Finance confirms any order over ₦2m and every mismatch or flagged screenshot before release. The warehouse can only load orders whose Zoho status is Payment confirmed.",
  oversight: "on",
  name: "Payment proof checker",
  hours_saved_per_month: 40,
  systems: ["WhatsApp Business", "Gmail", "Zoho CRM", "Excel", "Online banking"],
};

export const DEMO_RANK: Rank = { value: 5, effort: "medium", readiness: "partly", risk: "high", reversibility: "cannot" };

// Fixed so the business case shows the same 8-month likely payback every time.
export const DEMO_BUSINESS: BusinessInputs = {
  cases_per_month: 300,
  minutes_per_case: 12,
  automatable_share: 0.7,
  hourly_rate: 6000,
  build_days: 10,
  build_day_rate: 150000,
  running_cost_per_month: 60000,
  source: "edited",
};

// Ready answers for Make it stronger, by question topic. The AI writes the
// questions live, so answers are matched on topic, not wording.
export const DEMO_ANSWERS: Record<string, string> = {
  volume: "About 300 payments a month, rising to 450 at month end. Around 60% of proofs come by WhatsApp, 40% by Gmail.",
  data: "Pro forma invoices and orders are in Zoho CRM, but some branches still use Excel. Bank credit alerts come by email from GTBank and Access Bank. Not every customer uses the invoice reference.",
  access: "Finance can log in to online banking and export a daily statement as CSV. There is no bank API yet. IT owns the Zoho admin account.",
  privacy: "Yes: customer names, account names and partial account numbers appear on the screenshots.",
  risk: "Goods worth up to ₦4.5m leave on a fake payment and are hard to recover. Today we would only notice at month-end reconciliation.",
  people: "The finance manager owns payment confirmation. The warehouse supervisor releases trucks. Sales admin talks to the customer.",
  success: "No truck loaded before the credit is confirmed in the bank, and confirmation time down from about 2 hours to 10 minutes.",
  cost: "Two sales admins spend about 3 hours a day between them chasing and checking proofs, plus finance time to confirm.",
};

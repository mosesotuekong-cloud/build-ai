// Where the business is. Steers the AI's examples, tools and currency, and
// sets the default rates in the business case (people can change them).
// Rates are rough, fully loaded figures for office work and for a builder's
// day; they are starting points, not market data.
export const REGIONS = [
  { slug: "uk", name: "United Kingdom", country: "the United Kingdom", currency: "£", hourlyRate: 35, buildDayRate: 600, euAiAct: false },
  { slug: "europe", name: "Europe", country: "Europe (EU)", currency: "€", hourlyRate: 38, buildDayRate: 650, euAiAct: true },
  { slug: "nigeria", name: "Nigeria", country: "Nigeria", currency: "₦", hourlyRate: 6000, buildDayRate: 150000, euAiAct: false },
  { slug: "us", name: "United States", country: "the United States", currency: "$", hourlyRate: 45, buildDayRate: 800, euAiAct: false },
  { slug: "other", name: "Somewhere else", country: "an international business", currency: "$", hourlyRate: 30, buildDayRate: 500, euAiAct: false },
] as const;

export type RegionSlug = (typeof REGIONS)[number]["slug"];
export type Region = (typeof REGIONS)[number];
export const REGION_SLUGS = REGIONS.map((r) => r.slug) as [RegionSlug, ...RegionSlug[]];
export const getRegion = (slug: string): Region => REGIONS.find((r) => r.slug === slug) ?? REGIONS[0];

// Money as people read it: £12,400 or ₦1.2m.
export function money(amount: number, currency: string): string {
  const n = Math.round(amount);
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${currency}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  return `${sign}${currency}${abs.toLocaleString("en-GB")}`;
}

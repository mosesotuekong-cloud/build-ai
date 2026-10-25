// Where the business is. Steers the AI's examples, tools and currency.
export const REGIONS = [
  { slug: "uk", name: "United Kingdom", country: "the United Kingdom", currency: "£" },
  { slug: "europe", name: "Europe", country: "Europe (EU)", currency: "€" },
  { slug: "nigeria", name: "Nigeria", country: "Nigeria", currency: "₦" },
  { slug: "us", name: "United States", country: "the United States", currency: "$" },
  { slug: "other", name: "Somewhere else", country: "an international business", currency: "$" },
] as const;

export type RegionSlug = (typeof REGIONS)[number]["slug"];
export const REGION_SLUGS = REGIONS.map((r) => r.slug) as [RegionSlug, ...RegionSlug[]];
export const getRegion = (slug: string) => REGIONS.find((r) => r.slug === slug) ?? REGIONS[0];

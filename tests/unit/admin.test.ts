import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { slugify } from "@/lib/admin";

describe("organisation slugs", () => {
  it("are lower-case, hyphenated and URL-safe", () => {
    expect(slugify("Acme Foods Ltd")).toBe("acme-foods-ltd");
    expect(slugify("  Café & Co. (Lagos)  ")).toBe("cafe-co-lagos");
    expect(slugify("!!!")).toBe("org");
    expect(slugify("x".repeat(80))).toHaveLength(48);
  });
});

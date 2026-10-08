import { describe, expect, it } from "vitest";
import { generateJoinCode, isValidJoinCode, normaliseJoinCode } from "@/lib/session/codes";

describe("join codes", () => {
  it("generates six readable characters with no look-alikes", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateJoinCode();
      expect(isValidJoinCode(code)).toBe(true);
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it("accepts what people actually type", () => {
    expect(normaliseJoinCode(" abc-d2e ")).toBe("ABCD2E");
    expect(normaliseJoinCode("b0x1ab")).toBe("BOXIAB");
  });

  it("rejects codes that are too short or contain symbols", () => {
    expect(isValidJoinCode("ABC12")).toBe(false);
    expect(isValidJoinCode("ABC!23")).toBe(false);
  });
});

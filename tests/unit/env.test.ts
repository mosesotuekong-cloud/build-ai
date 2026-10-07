import { describe, expect, it } from "vitest";
import { getMockStatus, readServerEnv, superAdminEmails } from "@/lib/config/env";

describe("server env", () => {
  it("uses mocks when keys are missing or blank", () => {
    const env = readServerEnv({ ANTHROPIC_API_KEY: "  ", N8N_WEBHOOK_BASE_URL: "" });
    expect(getMockStatus(env)).toEqual({ mockAI: true, mockN8n: true, aiProvider: "mock" });
  });

  it("goes live when keys are present", () => {
    const env = readServerEnv({ ANTHROPIC_API_KEY: "sk-test", N8N_WEBHOOK_BASE_URL: "https://n8n.example.com/webhook" });
    expect(getMockStatus(env)).toEqual({ mockAI: false, mockN8n: false, aiProvider: "anthropic" });
  });

  it("uses OpenAI when only the OpenAI key is set", () => {
    expect(getMockStatus(readServerEnv({ OPENAI_API_KEY: "sk-test" }))).toMatchObject({ mockAI: false, aiProvider: "openai" });
  });

  it("prefers Anthropic when both keys are set", () => {
    expect(getMockStatus(readServerEnv({ OPENAI_API_KEY: "sk-a", ANTHROPIC_API_KEY: "sk-b" })).aiProvider).toBe("anthropic");
  });

  it("can be forced onto the mock even with keys set", () => {
    expect(getMockStatus(readServerEnv({ OPENAI_API_KEY: "sk-a", AI_PROVIDER: "mock" }))).toMatchObject({ mockAI: true, aiProvider: "mock" });
  });

  it("parses super admin emails case-insensitively", () => {
    const env = readServerEnv({ SUPER_ADMIN_EMAILS: " Moses@Example.com , ,other@example.com" });
    expect(superAdminEmails(env)).toEqual(["moses@example.com", "other@example.com"]);
  });

  it("defaults the super admin to Moses", () => {
    expect(superAdminEmails(readServerEnv({}))).toEqual(["otumosesjobs@gmail.com"]);
  });
});

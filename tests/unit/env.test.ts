import { describe, expect, it } from "vitest";
import { getMockStatus, readServerEnv, superAdminEmails } from "@/lib/config/env";

describe("server env", () => {
  it("uses mocks when keys are missing or blank", () => {
    const env = readServerEnv({ ANTHROPIC_API_KEY: "  ", N8N_WEBHOOK_BASE_URL: "" });
    expect(getMockStatus(env)).toEqual({ mockAI: true, mockN8n: true });
  });

  it("goes live when keys are present", () => {
    const env = readServerEnv({ ANTHROPIC_API_KEY: "sk-test", N8N_WEBHOOK_BASE_URL: "https://n8n.example.com/webhook" });
    expect(getMockStatus(env)).toEqual({ mockAI: false, mockN8n: false });
  });

  it("parses super admin emails case-insensitively", () => {
    const env = readServerEnv({ SUPER_ADMIN_EMAILS: " Moses@Example.com , ,other@example.com" });
    expect(superAdminEmails(env)).toEqual(["moses@example.com", "other@example.com"]);
  });

  it("defaults the super admin to Moses", () => {
    expect(superAdminEmails(readServerEnv({}))).toEqual(["otumosesjobs@gmail.com"]);
  });
});

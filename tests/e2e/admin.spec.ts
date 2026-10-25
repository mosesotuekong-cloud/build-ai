import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test } from "@playwright/test";

// The super admin console: someone signs in and waits; the admin creates an
// organisation, manages its credits, adds them, then pauses the organisation.
config({ path: ".env.local", quiet: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const MAILPIT = "http://127.0.0.1:54319";

async function magicLink(page: import("@playwright/test").Page, email: string, landing: RegExp) {
  const before = Date.now();
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  let link: string | null = null;
  for (let i = 0; i < 30 && !link; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`)).json();
    const m = list.messages?.[0];
    if (m && new Date(m.Created).getTime() >= before - 2000) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
      link = (full.Text as string).match(/https?:\/\/\S+/)?.[0] ?? null;
    }
    if (!link) await page.waitForTimeout(250);
  }
  if (!link) throw new Error(`No magic link for ${email}`);
  await page.goto(link);
  await page.waitForURL(landing);
}

test.skip(({ isMobile }) => isMobile, "Desktop console.");

test("super admin creates an organisation, manages credits and access", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const orgName = `Playwright Org ${Date.now()}`;
  // Leftovers from an earlier failed run would hide the waiting person.
  await admin.from("organizations").delete().like("name", "Playwright Org %");

  // Someone signs in for the first time and waits for access.
  const waiting = await (await browser.newContext()).newPage();
  await magicLink(waiting, "e2e-waiting@builda.test", /\/waiting/);
  await expect(waiting.getByText(/isn't linked to an organisation yet/)).toBeVisible();
  // They can't see the admin console.
  const denied = await waiting.goto("/admin");
  expect(denied?.status()).toBe(404);

  // The super admin sees them waiting.
  await magicLink(page, "e2e-admin@builda.test", /\/console/);
  await page.getByRole("link", { name: "Super admin" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("e2e-waiting@builda.test")).toBeVisible();

  // Create the organisation with starting credits.
  await page.getByLabel("New organisation").fill(orgName);
  await page.getByLabel("Starting credits").fill("3");
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByRole("heading", { name: orgName })).toBeVisible();
  await expect(page.getByLabel("Credit balance")).toHaveText("3");

  // Grant more; refuse going below zero.
  await page.getByLabel("Credits to add or remove").fill("2");
  await page.getByLabel("Reason").fill("Invoice 001");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("Done. The balance is now 5.")).toBeVisible();
  await expect(page.getByText("Invoice 001")).toBeVisible();
  await page.getByLabel("Credits to add or remove").fill("-10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("That would take the balance below zero.")).toBeVisible();

  // Add the waiting person; they get into the console.
  await page.getByLabel("Add someone by email").fill("e2e-waiting@builda.test");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("e2e-waiting@builda.test can now open the console.")).toBeVisible();
  await waiting.goto("/waiting");
  await waiting.waitForURL(/\/console/);

  // Pausing the organisation locks them out again.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  await waiting.goto("/console");
  await waiting.waitForURL(/\/waiting/);
  await expect(waiting.getByText(/account is paused/)).toBeVisible();

  // Tidy up.
  await admin.from("organizations").delete().eq("name", orgName);
});

import { config } from "dotenv";
import { expect, test } from "@playwright/test";

// Phase 1 measurement: a visitor finishes a discovery, downloads the PDF and
// says how useful it was; the super admin sees it on the pilot dashboard.
config({ path: ".env.local", quiet: true });
const MAILPIT = "http://127.0.0.1:54319";

async function magicLink(page: import("@playwright/test").Page, email: string) {
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
}

test("feedback and downloads reach the pilot dashboard", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough.");
  test.setTimeout(180_000);
  const note = `Pilot note ${Date.now()}`;

  await page.goto("/discover/new");
  await page.getByText("Operations", { exact: true }).click();
  await page.locator("label", { hasText: /^n8n/ }).first().click();
  await page.getByRole("button", { name: /Next: choose the challenge/ }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const id = page.url().split("/").pop();
  await page.getByLabel("Give it a short title").fill("Stock counts on paper");
  await page.getByLabel("What happens today?").fill("Warehouse staff count stock on paper and type it into Excel at night.");
  await page.getByRole("button", { name: /Deal the cards/ }).click();
  await expect(page.getByText("Card 1 of 7")).toBeVisible({ timeout: 30_000 });
  const next = () => page.getByRole("button", { name: /Next card/ }).click();
  await next();
  await page.getByRole("textbox", { name: "Trigger" }).fill("A count sheet is photographed");
  await next();
  await next();
  await next();
  await page.getByRole("textbox", { name: "Action" }).fill("Update the stock sheet");
  await next();
  await next();
  await page.getByRole("button", { name: "Useful" }).click();
  await page.getByRole("button", { name: /^Ready/ }).click();
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByRole("heading", { name: "Take it away" })).toBeVisible({ timeout: 60_000 });

  expect((await page.request.get(`/api/discover/${id}/pdf`)).status()).toBe(200);
  await page.getByRole("radio", { name: "Very" }).click();
  await page.getByLabel("What would make it more useful? (optional)").fill(note);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("button", { name: "Thanks, sent" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Very" })).toHaveAttribute("aria-checked", "true");

  const adminPage = await (await browser.newContext()).newPage();
  await magicLink(adminPage, "e2e-admin@builda.test");
  await adminPage.goto("/admin/pilot?period=7");
  await expect(adminPage.getByRole("heading", { name: "Pilot metrics" })).toBeVisible();
  await expect(adminPage.getByText(note)).toBeVisible();
  await expect(adminPage.getByText("Workflow PDF")).toBeVisible();
});

test("visitors can't open the pilot dashboard", async ({ page }) => {
  await page.goto("/admin/pilot");
  await expect(page.getByRole("heading", { name: "Pilot metrics" })).toHaveCount(0);
});

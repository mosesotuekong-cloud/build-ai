import { expect, test } from "@playwright/test";

// The game layer and Ask Builda: the board fills as cards are passed, badges
// pop, the verdict stamps down, twists earn a badge, and the chat answers
// and remembers. Runs with the mock AI.
test("the board, badges, twist and Ask Builda", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough.");
  test.setTimeout(180_000);

  await page.goto("/discover/new");
  await page.getByText("Finance", { exact: true }).click();
  await page.locator("label", { hasText: /^n8n/ }).first().click();
  await page.getByRole("button", { name: /Next: choose the challenge/ }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  await page.getByRole("button", { name: "Ask Builda" }).click();
  await page.getByRole("button", { name: "What makes a good challenge?" }).click();
  await expect(page.locator("#ask-builda")).toContainText("sample reply", { timeout: 30_000 });
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByLabel("Give it a short title").fill("Screenshots that look paid");
  await page.getByLabel("What happens today?").fill("Customers send bank transfer screenshots by WhatsApp and sales admin checks them by hand.");
  await page.getByRole("button", { name: /Deal the cards/ }).click();
  await expect(page.getByText("Card 1 of 7")).toBeVisible({ timeout: 30_000 });

  const fix = page.locator("section[aria-labelledby=card-title] input");
  await fix.nth(0).fill("Accepting screenshots as proof");
  await fix.nth(1).fill("One payments number and inbox");
  await fix.nth(2).fill("A reference on every invoice");
  const next = () => page.getByRole("button", { name: /Next card/ }).click();
  await next();
  await expect(page.getByText("Waste hunter")).toBeVisible();
  await page.getByRole("textbox", { name: "Trigger" }).fill("A customer sends payment proof to the payments WhatsApp number");
  await next();
  await expect(page.locator("[aria-label='Your design so far']")).toContainText("payments WhatsApp number");
  await next();
  await next();
  await page.getByRole("textbox", { name: "Action" }).fill("Mark the deal paid in Zoho and tell the warehouse");
  await next();
  await next();
  await page.getByRole("button", { name: "A big deal" }).click();
  await page.getByRole("button", { name: /^Partly/ }).click();
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByRole("heading", { name: "Take it away" })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[role=status]", { hasText: "Plan it" })).toBeVisible({ timeout: 5_000 });

  await page.getByRole("button", { name: "Draw a twist card" }).click();
  await page.locator("section[aria-labelledby=twist-h] textarea").fill("We would use the daily statement export instead of an API.");
  await page.getByRole("button", { name: "Save our answer" }).click();
  await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible();

  await page.getByRole("button", { name: "Ask Builda" }).click();
  await page.getByRole("button", { name: "Why did we get this verdict?" }).click();
  await expect(page.locator("#ask-builda")).toContainText("Why did we get this verdict?");
  await page.reload();
  await page.getByRole("button", { name: "Ask Builda" }).click();
  await expect(page.locator("#ask-builda")).toContainText("Why did we get this verdict?");
});

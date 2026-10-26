import { expect, test } from "@playwright/test";

// One-click demo mode: /discover/demo loads the payment-proof checker with
// every card answered; clicking through fills the board, the build gives
// Plan it and the 8-month payback, and Fill demo answers fills Make it
// stronger. Runs with the mock AI.
test("the worked example runs from one click", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough.");
  test.setTimeout(180_000);

  await page.goto("/discover/demo");
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Screenshots that look paid" })).toBeVisible();
  await expect(page.getByText("Amaka's card")).toBeVisible();

  for (const [n, who] of [[2, "Tunde"], [3, "Grace"], [4, "Amaka"], [5, "Tunde"], [6, "Grace"], [7, "Amaka"]] as const) {
    await page.getByRole("button", { name: `Pass to ${who} →` }).click();
    await expect(page.getByText(`Card ${n} of 7`)).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.locator("[aria-label='Your design so far']")).toContainText("Finance confirms any order");
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByRole("heading", { name: "At a glance" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Plan it").first()).toBeVisible();
  await expect(page.getByLabel("Cases a month")).toHaveValue("300");
  await expect(page.getByText("8 months").first()).toBeVisible();

  await page.getByRole("button", { name: /Make it stronger/ }).click();
  await page.getByRole("button", { name: "✨ Fill demo answers" }).click();
  const answers = page.locator("section[aria-labelledby=strong-h] form input[aria-label]");
  const n = await answers.count();
  for (let i = 0; i < n; i++) expect(await answers.nth(i).inputValue()).not.toBe("");
  await page.getByRole("button", { name: /Strengthen my workflow/ }).click();
  await expect(page.getByText("Strengthened with your answers")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Cases a month")).toHaveValue("300");
});

test("the setup page offers the worked example", async ({ page }) => {
  await page.goto("/discover/new");
  await page.getByRole("button", { name: "▶ Load the worked example" }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByText("Card 1 of 7")).toBeVisible();
});

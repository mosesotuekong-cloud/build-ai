import { expect, test } from "@playwright/test";

// Quick discovery, round two: start from the week, effort and
// reversibility, the verdict, the business case and the EU AI Act check.
test("a team starts from its week and gets a verdict, business case and AI Act check", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough.");
  test.setTimeout(180_000);

  await page.goto("/discover/new");
  await page.getByText("HR", { exact: true }).click();
  await page.locator("label", { hasText: /^n8n/ }).first().click();
  await page.getByText("Europe", { exact: true }).click();
  await page.getByRole("button", { name: /Next: choose the challenge/ }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  await page.getByRole("tab", { name: "Start from our week" }).click();
  await page.getByLabel("What do you do every week?").fill("Chasing documents\nCopying claims into Excel\nAnswering policy questions");
  await page.getByRole("button", { name: /Sort our week/ }).click();
  await expect(page.getByRole("region", { name: "Automate" })).toBeVisible({ timeout: 30_000 });
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: /Deal the cards/ }).click();
  await expect(page.getByText("Card 1 of 7")).toBeVisible({ timeout: 30_000 });

  const next = () => page.getByRole("button", { name: /Next card/ }).click();
  await next();
  await page.getByRole("textbox", { name: "Trigger" }).fill("A candidate applies");
  await next();
  await next();
  await page.getByRole("textbox", { name: "Decision" }).fill("AI scores each CV and shortlists candidates");
  await next();
  await page.getByRole("textbox", { name: "Action" }).fill("Invite the shortlist to interview");
  await next();
  await next();
  await page.getByRole("button", { name: "A lot" }).click();
  await page.getByRole("button", { name: /^Small/ }).click();
  await page.getByRole("button", { name: /^Ready/ }).click();
  await page.getByRole("button", { name: /^Low/ }).click();
  await page.getByRole("button", { name: /^Can't be undone/ }).click();
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByRole("heading", { name: "Take it away" })).toBeVisible({ timeout: 60_000 });

  await expect(page.getByRole("heading", { name: "Plan it" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Likely high-risk under the EU AI Act/ })).toBeVisible();
  await page.getByLabel("Cases a month").fill("500");
  await page.getByRole("button", { name: "Save these numbers" }).click();
  await expect(page.getByText("Saved. The PDF uses these numbers.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Cases a month")).toHaveValue("500");
});

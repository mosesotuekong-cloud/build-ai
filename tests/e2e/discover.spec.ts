import { expect, test } from "@playwright/test";

// Quick discovery, the main flow: set up, pick an AI challenge, draw the
// cards, build the workflow, download the outputs and strengthen it. Runs
// with the mock AI (see playwright.config.ts).
test("a team runs a quick discovery from setup to a strengthened workflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough; the phone layout is covered elsewhere.");
  test.setTimeout(180_000);

  await page.goto("/");
  await page.getByRole("link", { name: "Start a discovery" }).first().click();
  await page.getByText("Finance", { exact: true }).click();
  await page.getByRole("button", { name: "One more player" }).click();
  await page.getByLabel("Player 1 name").fill("Ada");
  await page.locator("label", { hasText: /^n8n/ }).first().click();
  await page.getByRole("button", { name: /Next: choose the challenge/ }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const url = page.url();

  await page.getByRole("tab", { name: /AI, suggest some/ }).click();
  await expect(page.getByText("Tap a card to choose it.")).toBeVisible({ timeout: 30_000 });
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: /Deal the cards/ }).click();
  await expect(page.getByText("Card 1 of 7")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Ada's card")).toBeVisible();

  const next = () => page.getByRole("button", { name: /Pass to|Next card/ }).click();
  await next();
  await page.getByRole("textbox", { name: "Trigger" }).fill("A supplier emails an invoice");
  await next();
  await page.getByRole("textbox", { name: "Steps" }).fill("Read the invoice and find the PO");
  await next();
  await page.getByRole("textbox", { name: "Decision" }).fill("Approve if the amounts match");
  await next();
  await page.getByRole("textbox", { name: "Action" }).fill("Book it for payment");
  await next();
  await page.getByRole("radio", { name: /On the loop/ }).click();
  await next();
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByText(/Before building, pick how much it's worth and how ready/)).toBeVisible();
  await page.getByRole("button", { name: "A lot" }).click();
  await page.getByRole("button", { name: /^Ready/ }).click();
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByRole("heading", { name: "At a glance" })).toBeVisible({ timeout: 60_000 });

  const id = url.split("/").pop();
  for (const file of ["pdf", "n8n", "mcp-server", "mcp-workflow", "mcp-tool"]) {
    expect((await page.request.get(`/api/discover/${id}/${file}`)).status(), file).toBe(200);
  }
  // Starter packages for tools outside the stack aren't offered.
  expect((await page.request.get(`/api/discover/${id}/power-automate`)).status()).toBe(404);

  await page.getByRole("button", { name: /Make it stronger/ }).click();
  await page.getByRole("button", { name: "20 to 100" }).click();
  await page.getByRole("button", { name: "Spread across files" }).click();
  await page.getByRole("button", { name: /Strengthen my workflow/ }).click();
  await expect(page.getByText("Strengthened with your answers")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Your next 30 days" })).toBeVisible();
});

test("a discovery is private to the person who made it", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough.");
  await page.goto("/discover/new");
  await page.getByText("HR", { exact: true }).click();
  await page.locator("label", { hasText: /^Zapier/ }).first().click();
  await page.getByRole("button", { name: /Next: choose the challenge/ }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const url = page.url();

  const stranger = await (await browser.newContext()).newPage();
  const response = await stranger.goto(url);
  expect(response?.status()).toBe(404);
});

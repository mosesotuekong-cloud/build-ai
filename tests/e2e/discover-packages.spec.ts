import { expect, test } from "@playwright/test";

// A Microsoft and data stack gets the Power Automate, Copilot, Databricks and
// Fabric starter packages instead of n8n, and only those.
test("a Microsoft and data stack downloads its starter packages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough.");
  test.setTimeout(180_000);

  await page.goto("/discover/new");
  await page.getByText("Finance", { exact: true }).click();
  for (const tool of [/^Power Automate/, /^Microsoft 365 Copilot/, /^Databricks agents/, /^Microsoft Fabric/]) await page.locator("label", { hasText: tool }).first().click();
  await page.getByRole("button", { name: /Next: choose the challenge/ }).click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const id = page.url().split("/").pop();

  await page.getByRole("tab", { name: /AI, suggest some/ }).click();
  await expect(page.getByText("Tap a card to choose it.")).toBeVisible({ timeout: 30_000 });
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: /Deal the cards/ }).click();
  await expect(page.getByText("Card 1 of 7")).toBeVisible({ timeout: 30_000 });
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
  await page.getByRole("button", { name: "A lot" }).click();
  await page.getByRole("button", { name: /^Ready/ }).click();
  await page.getByRole("button", { name: /Build my workflow/ }).click();
  await expect(page.getByRole("heading", { name: "At a glance" })).toBeVisible({ timeout: 60_000 });

  for (const label of ["Power Automate flow", "Copilot agent", "Databricks bundle", "Fabric notebooks and pipelines"]) await expect(page.getByRole("link", { name: new RegExp(label) })).toBeVisible();
  await expect(page.getByRole("link", { name: /n8n JSON/ })).toHaveCount(0);

  for (const file of ["power-automate", "copilot-agent", "databricks", "fabric"]) {
    const res = await page.request.get(`/api/discover/${id}/${file}`);
    expect(res.status(), file).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/zip");
    const body = await res.body();
    expect(body.readUInt32LE(0), `${file} is a zip`).toBe(0x04034b50);
  }

  await page.locator("summary", { hasText: "How to use the starter packages" }).click();
  await expect(page.getByText(/Import Package \(Legacy\)/)).toBeVisible();
});

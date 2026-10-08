import { expect, test } from "@playwright/test";

test("home page shows the headline and plays the demo round", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your team knows what's broken." })).toBeVisible();
  await expect(page.getByText("Watch a round")).toBeVisible();
  // The demo deals cards, then builds the five-slot design.
  await expect(page.getByText("Candidate submits the application form")).toBeVisible({ timeout: 10_000 });
});

test("the console sends signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/console");
  await expect(page).toHaveURL(/\/login\?next=%2Fconsole/);
  await expect(page.getByRole("heading", { name: "Facilitator sign in" })).toBeVisible();
});

test("asking for a magic link confirms it was sent", async ({ page }, testInfo) => {
  await page.goto("/login");
  // Its own address, so it never cancels another test's sign-in link.
  await page.getByLabel("Work email").fill(`smoke-${testInfo.project.name}@builda.test`);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

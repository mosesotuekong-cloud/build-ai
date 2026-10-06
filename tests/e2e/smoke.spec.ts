import { expect, test } from "@playwright/test";

test("home page shows the wordmark and the five slots", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Builda").first()).toBeVisible();
  await expect(page.getByRole("list", { name: "The five-slot canvas" }).getByRole("listitem")).toHaveCount(5);
});

test("the console sends signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/console");
  await expect(page).toHaveURL(/\/login\?next=%2Fconsole/);
  await expect(page.getByRole("heading", { name: "Facilitator sign in" })).toBeVisible();
});

test("asking for a magic link confirms it was sent", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("facilitator@builda.test");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

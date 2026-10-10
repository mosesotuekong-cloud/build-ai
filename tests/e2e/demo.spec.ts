import { expect, test } from "@playwright/test";

// The no-sign-in demo: from the home page to all three stops, without an
// email or a password.
test("a visitor tries the demo without signing up", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "One run is enough; the phone layout is covered elsewhere.");
  test.setTimeout(120_000);

  await page.goto("/");
  await page.getByRole("link", { name: "Try the demo" }).click();
  await page.getByRole("button", { name: "Start the demo" }).click();
  await expect(page.getByRole("heading", { name: "Three stops, ten minutes." })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/You're in a demo sandbox/)).toBeVisible();

  // Stop 3: the sample opportunity map, ready at once, without a rewrite button.
  await page.getByRole("link", { name: "Open the opportunity map" }).click();
  await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Write it again" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();

  // Stop 2: the room is in the lobby with four teams; Fix it first, then design.
  await page.getByRole("link", { name: "Back to the tour" }).click();
  await page.getByRole("link", { name: "Open the facilitator console" }).click();
  await expect(page.getByRole("heading", { name: /Demo room/ })).toBeVisible();
  for (const team of ["Your team", "Night Owls", "Early Birds", "Lions"]) await expect(page.getByText(team, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Start: Fix it first" }).click();
  await page.getByRole("button", { name: "Start: Design" }).click();
  await expect(page.getByRole("button", { name: "Start: Twist" })).toBeVisible();

  // Stop 1: a practice case on the real canvas.
  await page.getByRole("link", { name: "Back to the tour" }).click();
  await page.getByRole("button", { name: /^Play "/ }).click();
  await expect(page.getByRole("heading", { name: "Your design" })).toBeVisible({ timeout: 30_000 });

  // A demo visitor can still go and sign in for real.
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Facilitator sign in" })).toBeVisible();
});

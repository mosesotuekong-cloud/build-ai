import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// These flows never call the AI, so they are safe to run with a live key.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "Deck editing is a facilitator task on a laptop.");

test("copy the library HR deck, then edit, reorder, add and delete cases", async ({ page }) => {
  await signIn(page);
  await page.goto("/console/decks");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

  await page.getByRole("button", { name: "Use this deck" }).first().click();
  await page.waitForURL(/\/console\/decks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "HR essentials" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /HR · 6 cases/ })).toBeVisible();

  // Edit the first case.
  await page.getByRole("button", { name: "The WhatsApp leave jungle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("The WhatsApp leave jungle (edited)");
  await dialog.getByRole("button", { name: "Save case" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "The WhatsApp leave jungle (edited)" })).toBeVisible();

  // Move the second case to the front.
  const second = page.getByLabel("Actions for The onboarding document chase");
  await second.getByRole("button", { name: "Move earlier" }).click();
  await expect(page.locator("main li h3").first()).toHaveText("The onboarding document chase");

  // Write a new case.
  await page.getByRole("button", { name: "Write your own case" }).click();
  await dialog.getByLabel("Title").fill("The training budget black hole");
  await dialog.getByLabel("Story").fill("Training requests arrive by email and nobody tracks the budget until it has run out in October.");
  await dialog.getByLabel("What it costs the business").fill("Courses booked twice and urgent training refused late in the year.");
  await dialog.getByLabel("Who feels it").fill("L&D officer, line managers");
  await dialog.getByRole("button", { name: "Add case" }).click();
  await expect(page.getByRole("heading", { name: /HR · 7 cases/ })).toBeVisible();

  // Delete it again.
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Actions for The training budget black hole").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: /HR · 6 cases/ })).toBeVisible();

  // Tidy up the copy.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
});

test("validation explains what to fix on a hand-written case", async ({ page }) => {
  await signIn(page);
  await page.goto("/console/decks");
  await page.getByRole("button", { name: "Use this deck" }).first().click();
  await page.waitForURL(/\/console\/decks\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Write your own case" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Payroll");
  await dialog.getByLabel("Story").fill("Too short.");
  await dialog.getByRole("button", { name: "Add case" }).click();
  await expect(dialog.getByText("Tell the story in at least a sentence or two.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
});

test("create an empty deck and delete it", async ({ page }) => {
  await signIn(page);
  await page.goto("/console/decks/new");
  await page.getByLabel("Deck name").fill("Playwright test deck");
  await page.getByLabel("Industry").fill("Testing");
  await page.getByLabel("Company size").selectOption("21–100 staff");
  await page.getByText("Finance", { exact: true }).click(); // add Finance to the default HR
  await page.getByRole("button", { name: "Start empty and write my own" }).click();

  await page.waitForURL(/\/console\/decks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /HR · 0 cases/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Finance · 0 cases/ })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
  await expect(page.getByText("Playwright test deck")).toHaveCount(0);
});

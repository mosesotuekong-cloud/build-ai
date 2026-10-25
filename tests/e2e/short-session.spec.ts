import { devices, expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// The shorter path: no solo rounds and no twist. One team plays lobby → fix →
// design → rank → reveal → commitments → report → closed. Runs on the mock AI.
test.skip(({ isMobile }) => isMobile, "Drives its own phone browser.");

test("a short session with the solo rounds and twist off", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signIn(page, "e2e-short@builda.test");

  await page.goto("/console/decks");
  await page.getByRole("button", { name: "Use this deck" }).first().click();
  await page.waitForURL(/\/console\/decks\/[0-9a-f-]{36}$/);
  const deckId = page.url().split("/").pop()!;

  await page.goto(`/console/sessions/new?deck=${deckId}`);
  await page.getByLabel("Session name").fill("Short run");
  await page.getByRole("checkbox", { name: /^Twist/ }).uncheck();
  await expect(page.getByRole("checkbox", { name: /^Before-and-after check/ })).not.toBeChecked();
  await page.getByRole("button", { name: "Create draft session" }).click();
  await page.waitForURL(/\/console\/sessions\/[0-9a-f-]{36}$/);
  // The phase list shows the short path only.
  const phases = page.getByRole("list", { name: "Session phases" });
  for (const gone of ["Warm-up round", "Twist", "Final round"]) await expect(phases.getByText(gone, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Open the lobby/ }).click();
  const code = (await page.getByLabel("Join code").innerText()).trim();

  const phone = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await phone.goto(`/join/${code}`);
  await phone.getByLabel("Your name").fill("Kemi");
  await phone.getByLabel("New team name").fill("Shortcuts");
  await phone.getByRole("button", { name: "Join the game" }).click();
  await phone.waitForURL(/\/play\/[0-9a-f-]{36}$/);
  await phone.getByRole("button", { name: "The WhatsApp leave jungle" }).click();

  // Lobby goes straight to Fix it first.
  await page.getByRole("button", { name: "Start: Fix it first" }).click();
  await expect(phone.getByRole("heading", { name: "Don't automate the mess." })).toBeVisible();

  await page.getByRole("button", { name: "Start: Design" }).click();
  await expect(phone.getByRole("heading", { name: "Your design" })).toBeVisible();
  await phone.getByRole("button", { name: "Edit control" }).click();
  await phone.getByRole("radio", { name: /^In the loop/ }).click();
  await phone.getByRole("button", { name: "Snap it in" }).click();
  await expect(phone.getByText("1 of 5 slots filled · Saved")).toBeVisible();

  // Design goes straight to Rank (no twist).
  await page.getByRole("button", { name: "Start: Rank" }).click();
  await phone.getByRole("radio", { name: "Value 4: A lot" }).click();
  await phone.getByRole("radio", { name: /^Partly/ }).click();
  await phone.getByRole("radio", { name: /^High/ }).click();
  await expect(phone.getByText("Strategic bets", { exact: true })).toBeVisible();
  await expect(page.getByText("1 of 1 teams judged")).toBeVisible({ timeout: 30_000 });

  // Reveal goes straight to Commitments (no final round).
  await page.getByRole("button", { name: "Start: Reveal" }).click();
  await expect(phone.getByRole("heading", { name: "Your score" })).toBeVisible();
  await page.getByRole("button", { name: "Start: Commitments" }).click();
  await expect(phone.getByRole("heading", { name: "Make it real" })).toBeVisible();
  await page.getByRole("button", { name: "Start: Report" }).click();
  await page.getByRole("link", { name: /Open the opportunity map/ }).click();
  await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Before and after" })).toHaveCount(0);

  // Close the session; tidy up.
  await page.getByRole("link", { name: "← Back to the session" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "End session" }).click();
  await expect(phone.getByRole("heading", { name: "Closed" })).toBeVisible();
  await page.goto(`/console/decks/${deckId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
});

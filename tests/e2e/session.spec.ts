import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// A full live session: a facilitator on a laptop and two players on phones,
// in separate browsers. Nothing here calls the AI.
test.skip(({ isMobile }) => isMobile, "Drives its own phone browsers.");

async function joinOnPhone(browser: Browser, code: string, name: string, team: { new: string } | { existing: string }): Promise<Page> {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await page.goto("/join");
  await page.getByLabel("Game code").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForURL(/\/join\/[A-Z2-9]{6}$/);
  await page.getByLabel("Your name").fill(name);
  if ("new" in team) {
    await page.getByLabel("Start a new team").check().catch(() => {});
    await page.getByLabel("New team name").fill(team.new);
  } else {
    await page.getByRole("radio", { name: team.existing }).check();
  }
  await page.getByRole("button", { name: "Join the game" }).click();
  await page.waitForURL(/\/play\/[0-9a-f-]{36}$/);
  return page;
}

test("facilitator runs a live session with two teams on phones", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await signIn(page, "e2e-session@builda.test");

  // A deck of our own to run.
  await page.goto("/console/decks");
  await page.getByRole("button", { name: "Use this deck" }).first().click();
  await page.waitForURL(/\/console\/decks\/[0-9a-f-]{36}$/);
  const deckId = page.url().split("/").pop()!;

  // Create the session and open the lobby.
  await page.goto(`/console/sessions/new?deck=${deckId}`);
  await page.getByLabel("Session name").fill("Playwright away day");
  await page.getByRole("button", { name: "Create draft session" }).click();
  await page.waitForURL(/\/console\/sessions\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: /Open the lobby/ }).click();
  const codeText = await page.getByLabel("Join code").innerText();
  const code = codeText.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);

  // The presenter screen shows the code.
  const presenter = await page.context().newPage();
  await presenter.goto(page.url().replace("/console/sessions/", "/present/"));
  await expect(presenter.getByText(code)).toBeVisible();

  // Two players join on phones; the first team draws a case.
  const ada = await joinOnPhone(browser, code, "Ada", { new: "The Fixers" });
  await expect(ada.getByRole("heading", { name: "The Fixers" })).toBeVisible();
  await ada.getByRole("button", { name: "The onboarding document chase" }).click();
  await expect(ada.getByRole("heading", { name: "Your case" })).toBeVisible();

  const tunde = await joinOnPhone(browser, code, "Tunde", { new: "Night Owls" });
  await expect(tunde.getByRole("heading", { name: "Night Owls" })).toBeVisible();

  // The facilitator and the projector see both teams arrive, without reloading.
  await expect(page.getByRole("heading", { name: "The Fixers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Night Owls" })).toBeVisible();
  await expect(presenter.getByText("Night Owls")).toBeVisible();

  // Warm-up round, then design. Phones follow along live.
  await page.getByRole("button", { name: "Start: Warm-up round" }).click();
  await expect(ada.getByText(/warm-up round/i)).toBeVisible();
  await page.getByRole("button", { name: "Start: Design" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "The onboarding document chase" })).toBeVisible();
  // Night Owls never picked, so they were dealt a case.
  await expect(tunde.getByRole("button", { name: "Edit trigger" })).toBeVisible();

  // Ada designs; the facilitator watches it appear.
  await ada.getByRole("button", { name: "Edit trigger" }).click();
  await ada.getByRole("dialog").getByRole("textbox").fill("A new hire accepts the offer in the HRIS");
  await ada.getByRole("button", { name: "Snap it in" }).click();
  await expect(ada.getByText("1 of 5 slots filled · Saved")).toBeVisible();

  // A teammate on another phone sees Ada's edit arrive, and adds their own.
  const chidi = await joinOnPhone(browser, code, "Chidi", { existing: "The Fixers" });
  await expect(chidi.getByText("A new hire accepts the offer in the HRIS")).toBeVisible();
  await chidi.getByRole("button", { name: "Edit action" }).click();
  await chidi.getByRole("dialog").getByRole("textbox").fill("Email IT the access checklist");
  await chidi.getByRole("button", { name: "Snap it in" }).click();
  await expect(ada.getByText("Email IT the access checklist")).toBeVisible();
  await page.getByRole("button", { name: /The Fixers/ }).click();
  await expect(page.getByLabel("The Fixers in detail").getByText("A new hire accepts the offer in the HRIS")).toBeVisible();

  // The twist locks the canvas and drops a bonus coin.
  await page.getByRole("button", { name: "Start: Twist" }).click();
  await expect(ada.getByText(/Twist! Something has changed/)).toBeVisible();
  await expect(ada.getByText("Hint coins: 4")).toBeAttached();
  await expect(ada.getByRole("button", { name: "Edit trigger" })).toBeDisabled();

  // Adapting: the canvas opens again, starting from the saved design.
  await page.getByRole("button", { name: "Start: Adapt" }).click();
  await expect(ada.getByRole("button", { name: "Edit trigger" })).toBeEnabled();
  await expect(ada.getByText("A new hire accepts the offer in the HRIS")).toBeVisible();

  // Move on, then end the session: phones show holding and closing screens.
  await page.getByRole("button", { name: "Start: Prioritise" }).click();
  await expect(tunde.getByRole("heading", { name: "Prioritise" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "End session" }).click();
  await expect(ada.getByRole("heading", { name: "Closed" })).toBeVisible();

  // Tidy up the copied deck.
  await page.goto(`/console/decks/${deckId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
});

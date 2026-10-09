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

  // Night Owls design their own problem instead of a deck card.
  await tunde.getByRole("button", { name: /Our own problem/ }).click();
  await tunde.getByLabel("Short name").fill("The visitor log book");
  await tunde.getByLabel("What happens today?").fill("Visitors sign a paper book at reception and nobody knows who is still on site during a fire drill.");
  await tunde.getByRole("button", { name: "Design this one" }).click();
  await expect(tunde.getByText("The visitor log book").first()).toBeVisible();

  // Ada raises a problem from her own work; the facilitator sees it.
  await ada.getByRole("button", { name: /Raise a problem/ }).click();
  await ada.getByLabel("Give it a short name").fill("Chasing signatures on paper");
  await ada.getByLabel("What happens today?").fill("Contracts go round the office on paper for five signatures and get lost.");
  await ada.getByRole("button", { name: "Add to the list" }).click();
  await expect(ada.getByText(/on the business's list/)).toBeVisible();
  await expect(page.getByText("Chasing signatures on paper")).toBeVisible();

  // The facilitator and the projector see both teams arrive, without reloading.
  await expect(page.getByRole("heading", { name: "The Fixers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Night Owls" })).toBeVisible();
  await expect(presenter.getByText("Night Owls")).toBeVisible();

  // Warm-up round: everyone on their own phone, with a practice card.
  await page.getByRole("button", { name: "Start: Warm-up round" }).click();
  await expect(ada.getByText(/Warm-up round · just you/i)).toBeVisible();
  const warmUpTitle = await ada.getByRole("heading", { level: 1 }).innerText();
  await ada.getByRole("button", { name: "Edit trigger" }).click();
  await ada.getByRole("dialog").getByRole("textbox").fill("The request arrives");
  await ada.getByRole("button", { name: "Snap it in" }).click();
  await ada.getByRole("button", { name: "Lock it in" }).click();
  await expect(ada.getByText(/Done. Wait for your facilitator/)).toBeVisible();
  await expect(page.getByText(/1 of 2 players have locked in their warm-up round/)).toBeVisible();

  // Design. Phones follow along live.
  await page.getByRole("button", { name: "Start: Design" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "The onboarding document chase" })).toBeVisible();
  await expect(tunde.getByRole("heading", { level: 1, name: "The visitor log book" })).toBeVisible();

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
  // Each team gets its own twist (the mock writes the same one for both).
  await expect(ada.getByText(/line manager who approves these is on leave/)).toBeVisible();
  await expect(presenter.getByText(/line manager who approves these is on leave/).first()).toBeVisible();
  await expect(ada.getByText("Hint coins: 4")).toBeAttached();
  await expect(ada.getByRole("button", { name: "Edit trigger" })).toBeDisabled();

  // Adapting: the canvas opens again, starting from the saved design.
  await page.getByRole("button", { name: "Start: Adapt" }).click();
  await expect(ada.getByRole("button", { name: "Edit trigger" })).toBeEnabled();
  await expect(ada.getByText("A new hire accepts the offer in the HRIS")).toBeVisible();

  // Prioritise: Ada rates the use case on the discovery scorecard.
  await page.getByRole("button", { name: "Start: Prioritise" }).click();
  await expect(ada.getByText("The Fixers · Prioritise")).toBeVisible();
  await ada.getByRole("button", { name: "Impact 5, effort 2" }).click();
  await ada.getByRole("radio", { name: "Daily" }).click();
  await ada.getByRole("button", { name: /Extract from documents/ }).click();
  await expect(ada.getByText(/Saved/)).toBeVisible();
  // The team detail is still open from earlier; it updates live.
  await expect(page.getByLabel("The Fixers in detail").getByText("Quick win")).toBeVisible();

  // Judging runs in the background; the projector drums, the console counts.
  await page.getByRole("button", { name: "Start: Judging" }).click();
  await expect(presenter.getByText(/The judges are deliberating/)).toBeVisible();
  await expect(page.getByText("2 of 2 teams judged")).toBeVisible({ timeout: 30_000 });

  // The facilitator overrides one score; both are kept.
  await page.getByLabel("Override for Night Owls").fill("95");
  await page.getByLabel("Override for Night Owls").press("Enter");
  await expect(page.getByLabel("Final score for Night Owls")).toHaveText("95");

  // The reveal: leaderboard and awards on the projector; score, awards and the
  // model answer on phones.
  await page.getByRole("button", { name: "Start: Reveal" }).click();
  await expect(presenter.getByRole("list", { name: "Leaderboard" })).toBeVisible();
  await expect(presenter.getByText("Top design")).toBeVisible();
  await expect(tunde.getByText("Top design")).toBeVisible();
  await expect(ada.getByRole("heading", { name: "Your score" })).toBeVisible();
  await expect(ada.getByRole("heading", { name: "One strong answer" })).toBeVisible();
  await expect(ada.getByText(/Model answer · Trigger/)).toBeVisible({ timeout: 30_000 });

  // Take-home files: the starter n8n workflow downloads as importable JSON.
  const starter = ada.getByRole("link", { name: /Starter n8n workflow/ });
  await expect(starter).toBeVisible({ timeout: 30_000 });
  await expect(ada.getByText(/This is a starter workflow, not a finished build/)).toBeVisible();
  const [download] = await Promise.all([ada.waitForEvent("download"), starter.click()]);
  expect(download.suggestedFilename()).toMatch(/-n8n-starter\.json$/);
  const workflow = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8")));
  expect(workflow.nodes.length).toBeGreaterThan(3);
  expect(Object.keys(workflow.connections).length).toBeGreaterThan(2);

  // The final round uses the other card of Ada's matched pair.
  await page.getByRole("button", { name: "Start: Final round" }).click();
  await expect(ada.getByText(/Final round · just you/i)).toBeVisible();
  await expect(ada.getByRole("heading", { level: 1 })).not.toHaveText(warmUpTitle);
  await ada.getByRole("button", { name: "Edit trigger" }).click();
  await ada.getByRole("dialog").getByRole("textbox").fill("The request form is submitted");
  await ada.getByRole("button", { name: "Snap it in" }).click();
  await ada.getByRole("button", { name: "Lock it in" }).click();
  await expect(ada.getByText(/Done\. Wait for your facilitator/)).toBeVisible();

  // Commitments: Ada's team pledges a first step; the console and projector see it.
  await page.getByRole("button", { name: "Start: Commitments" }).click();
  await expect(ada.getByRole("heading", { name: "Make it real" })).toBeVisible();
  await ada.getByLabel("The first step").fill("Ask IT who owns the onboarding checklist");
  await ada.getByRole("button", { name: "Sign our pledge" }).click();
  await expect(ada.getByText(/^Pledged\. You can still change it/)).toBeVisible();
  await expect(page.getByText("Ask IT who owns the onboarding checklist")).toBeVisible();
  await expect(presenter.getByText("Ask IT who owns the onboarding checklist")).toBeVisible();
  await expect(page.getByText(/Warm-up average \d+ → final round average \d+/)).toBeVisible({ timeout: 30_000 });

  // End the session: phones show the closing screen.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "End session" }).click();
  await expect(ada.getByRole("heading", { name: "Closed" })).toBeVisible();

  // Tidy up the copied deck.
  await page.goto(`/console/decks/${deckId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
});

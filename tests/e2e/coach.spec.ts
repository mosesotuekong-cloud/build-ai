import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { devices, expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// The coach in a live room: the inline coach on an idle slot, coins spent on
// a nudge, and coins earned back for acting on the coach. Runs on the mock AI.
config({ path: ".env.local", quiet: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

test.skip(({ isMobile }) => isMobile, "Drives its own phone browser.");

test("inline coach, paid nudge and earning coins back", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await signIn(page, "e2e-coach@builda.test");

  await page.goto("/console/decks");
  await page.getByRole("button", { name: "Use this deck" }).first().click();
  await page.waitForURL(/\/console\/decks\/[0-9a-f-]{36}$/);
  const deckId = page.url().split("/").pop()!;

  // A short session: no checks, no twist.
  await page.goto(`/console/sessions/new?deck=${deckId}`);
  await page.getByLabel("Session name").fill("Coach test");
  await page.getByRole("checkbox", { name: /^Twist/ }).uncheck();
  await page.getByRole("checkbox", { name: /^Before-and-after check/ }).uncheck();
  await page.getByRole("button", { name: "Create draft session" }).click();
  await page.waitForURL(/\/console\/sessions\/[0-9a-f-]{36}$/);
  const sessionId = page.url().split("/").pop()!;
  await page.getByRole("button", { name: /Open the lobby/ }).click();
  const code = (await page.getByLabel("Join code").innerText()).trim();

  const phone = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await phone.goto(`/join/${code}`);
  await phone.getByLabel("Your name").fill("Ngozi");
  await phone.getByLabel("New team name").fill("Coachables");
  await phone.getByRole("button", { name: "Join the game" }).click();
  await phone.waitForURL(/\/play\/[0-9a-f-]{36}$/);
  await phone.getByRole("button", { name: "The WhatsApp leave jungle" }).click();
  await expect(phone.getByRole("heading", { name: "Your case" })).toBeVisible();

  await page.getByRole("button", { name: "Start: Design" }).click();
  await expect(phone.getByRole("heading", { name: "Your design" })).toBeVisible();

  // Pretend the design phase started ten minutes ago, so the trigger slot is idle.
  await admin.from("sessions").update({ phase_started_at: new Date(Date.now() - 10 * 60_000).toISOString() }).eq("id", sessionId);
  const bubble = phone.getByRole("note", { name: "A question from the coach" });
  await expect(bubble).toBeVisible({ timeout: 45_000 });
  await expect(bubble).toContainText(/what actually starts this process/i);
  await expect(phone.getByText("Hint coins: 3")).toBeAttached();

  // Acting on it earns a coin back.
  await phone.getByRole("button", { name: "Edit trigger" }).click();
  await phone.getByRole("dialog").getByRole("textbox").fill("An employee submits the leave form on the intranet");
  await phone.getByRole("button", { name: "Snap it in" }).click();
  await expect(phone.getByText(/earned a coin back/)).toBeVisible();
  await expect(phone.getByText("Hint coins: 4")).toBeAttached();
  await expect(bubble).toBeHidden();

  // A nudge costs a coin; acting on it (the mock nudges the decision slot) earns it back.
  await phone.getByRole("button", { name: /Coach/ }).click();
  await phone.getByRole("button", { name: /Nudge/ }).click();
  await expect(phone.getByText(/decision step doesn't say how the call gets made/).filter({ visible: true })).toBeVisible();
  await expect(phone.getByText("Hint coins: 3")).toBeAttached();
  await phone.getByRole("button", { name: "Close" }).click();
  await phone.getByRole("button", { name: "Edit decision" }).click();
  await phone.getByRole("dialog").getByRole("textbox").fill("A rule: approve if the balance covers the days");
  await phone.getByRole("button", { name: "Snap it in" }).click();
  await expect(phone.getByText("Hint coins: 4")).toBeAttached();

  // The facilitator sees the coins earned.
  await expect(page.getByText(/2 coins earned/)).toBeVisible();

  // Tidy up.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "End session" }).click();
  await page.goto(`/console/decks/${deckId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete deck" }).click();
  await page.waitForURL(/\/console\/decks$/);
});

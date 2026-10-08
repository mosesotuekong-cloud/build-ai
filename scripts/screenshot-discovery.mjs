// Screenshots of the milestone 4 screens (warm-up round, lobby with "our own
// problem", scorecard, console discovery views) against the dev server.
// Usage: node scripts/screenshot-discovery.mjs <output-folder>
import { chromium, devices } from "@playwright/test";

const OUT = process.argv[2] ?? ".";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MAILPIT = "http://127.0.0.1:54319";
const browser = await chromium.launch();
const T = { timeout: 120000 };

async function signIn(page, email) {
  const before = Date.now();
  await page.goto(BASE + "/login", T);
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByRole("heading", { name: "Check your email" }).waitFor(T);
  let link = null;
  for (let i = 0; i < 80 && !link; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}&limit=1`)).json();
    const m = list.messages?.[0];
    if (m && new Date(m.Created).getTime() > before - 2000) link = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()).Text.match(/https?:\/\/\S+/)?.[0];
    if (!link) await page.waitForTimeout(250);
  }
  await page.goto(link, T);
  await page.waitForURL(/\/console/, T);
}

try {
  const fac = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  fac.setDefaultTimeout(120000);
  await signIn(fac, "facilitator@builda.test");
  await fac.goto(BASE + "/console/sessions/new", T);
  await fac.getByLabel("Session name").fill("Discovery day");
  const opts = await fac.getByLabel("Deck").locator("option").allTextContents();
  await fac.getByLabel("Deck").selectOption({ label: opts.find((o) => o.includes("Lagos")) ?? opts[0] });
  await fac.getByRole("button", { name: "Create draft session" }).click();
  await fac.waitForURL(/\/console\/sessions\/[0-9a-f-]{36}$/, T);
  await fac.getByRole("button", { name: /Open the lobby/ }).click();
  const code = (await fac.getByLabel("Join code").innerText()).trim();

  const phone = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  phone.setDefaultTimeout(120000);
  await phone.goto(`${BASE}/join/${code}`, T);
  await phone.getByLabel("Your name").fill("Amaka");
  await phone.getByLabel("New team name").fill("The Fixers");
  await phone.getByRole("button", { name: "Join the game" }).click();
  await phone.waitForURL(/\/play\//, T);
  await phone.getByRole("button", { name: /Our own problem/ }).scrollIntoViewIfNeeded();
  await phone.waitForTimeout(1500);
  await phone.screenshot({ path: `${OUT}/m4-phone-lobby.png` });
  await phone.locator("li button").first().click();

  await phone.getByRole("button", { name: /Raise a problem/ }).click();
  await phone.getByLabel("Give it a short name").fill("Chasing signatures on paper");
  await phone.getByLabel("What happens today?").fill("Contracts go round the office on paper for five signatures and get lost.");
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: `${OUT}/m4-phone-raise.png` });
  await phone.getByRole("button", { name: "Add to the list" }).click();

  await fac.getByRole("button", { name: "Start: Warm-up round" }).click();
  await phone.getByText(/Warm-up round · just you/).waitFor(T);
  await phone.getByRole("button", { name: "Edit trigger" }).click();
  await phone.getByRole("dialog").getByRole("textbox").fill("A staff member sends the request");
  await phone.getByRole("button", { name: "Snap it in" }).click();
  await phone.waitForTimeout(1200);
  await phone.screenshot({ path: `${OUT}/m4-phone-warmup.png` });
  await phone.getByRole("button", { name: "Lock it in" }).click();

  for (const step of ["Design", "Twist", "Adapt", "Prioritise"]) {
    await fac.getByRole("button", { name: `Start: ${step}` }).click();
    if (step === "Design") {
      // Wait for the design canvas (not the warm-up screen) before editing.
      await phone.getByRole("heading", { name: "Your design" }).waitFor(T);
      await phone.getByRole("button", { name: "Edit decision" }).click();
      await phone.getByRole("dialog").getByRole("textbox").fill("AI reads the waybill photo and extracts the delivery details");
      await phone.getByRole("button", { name: "Snap it in" }).click();
      await phone.waitForTimeout(1500);
    }
    await fac.waitForTimeout(1500);
  }
  await phone.getByText("The Fixers · Prioritise").waitFor(T);
  await phone.getByRole("button", { name: "Impact 4, effort 2" }).click();
  await phone.getByRole("radio", { name: "Daily" }).click();
  await phone.waitForTimeout(1500);
  await phone.screenshot({ path: `${OUT}/m4-phone-scorecard-1.png`, fullPage: false });
  await phone.getByText("Is the data ready?").scrollIntoViewIfNeeded();
  await phone.waitForTimeout(500);
  await phone.screenshot({ path: `${OUT}/m4-phone-scorecard-2.png` });

  await fac.waitForTimeout(2500);
  await fac.getByRole("button", { name: /The Fixers/ }).click();
  await fac.waitForTimeout(1500);
  await fac.screenshot({ path: `${OUT}/m4-console.png`, fullPage: true });
  fac.once("dialog", (d) => d.accept());
  await fac.getByRole("button", { name: "End session" }).click();
  console.log("done");
} finally {
  await browser.close();
}

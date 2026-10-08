// Runs a short live session against the dev server and saves screenshots of
// the console, presenter and phones. For reviewing the UI; no AI calls.
// Usage: node scripts/screenshot-session.mjs <output-folder>
import { chromium, devices } from "@playwright/test";

const OUT = process.argv[2] ?? ".";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MAILPIT = "http://127.0.0.1:54319";
const browser = await chromium.launch();

async function signIn(page, email) {
  const before = Date.now();
  await page.goto(BASE + "/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByRole("heading", { name: "Check your email" }).waitFor({ timeout: 30000 });
  let link = null;
  for (let i = 0; i < 60 && !link; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}&limit=1`)).json();
    const m = list.messages?.[0];
    if (m && new Date(m.Created).getTime() > before - 2000) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
      link = msg.Text.match(/https?:\/\/\S+/)?.[0] ?? null;
    }
    if (!link) await page.waitForTimeout(250);
  }
  if (!link) throw new Error("No magic link arrived");
  await page.goto(link);
  await page.waitForURL(/\/console/, { timeout: 30000 });
}

try {
  const fac = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  fac.setDefaultTimeout(30000);
  await signIn(fac, "facilitator@builda.test");
  await fac.goto(BASE + "/console/sessions/new");
  await fac.getByLabel("Session name").fill("Zenith Foods away day");
  const opts = await fac.getByLabel("Deck").locator("option").allTextContents();
  await fac.getByLabel("Deck").selectOption({ label: opts.find((o) => o.includes("Lagos")) ?? opts[0] });
  await fac.getByRole("button", { name: "Create draft session" }).click();
  await fac.waitForURL(/\/console\/sessions\/[0-9a-f-]{36}$/);
  await fac.getByRole("button", { name: /Open the lobby/ }).click();
  const code = (await fac.getByLabel("Join code").innerText()).trim();
  console.log("code", code);

  const presenter = await fac.context().newPage();
  await presenter.setViewportSize({ width: 1600, height: 900 });
  await presenter.goto(fac.url().replace("/console/sessions/", "/present/"), { timeout: 120000 });

  const phones = [];
  for (const [name, team] of [
    ["Amaka", "The Fixers"],
    ["Bayo", "Night Owls"],
  ]) {
    const p = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
    p.setDefaultTimeout(30000);
    await p.goto(`${BASE}/join/${code}`);
    await p.getByLabel("Your name").fill(name);
    if (!(await p.getByLabel("New team name").isVisible())) await p.getByText("Start a new team").click();
    await p.getByLabel("New team name").fill(team);
    await p.getByRole("button", { name: "Join the game" }).click();
    await p.waitForURL(/\/play\//);
    phones.push(p);
  }
  const phone = phones[0];
  await phone.waitForTimeout(1500);
  await phone.locator("li button").first().click();
  await phone.waitForTimeout(2000);
  await phone.screenshot({ path: `${OUT}/m3-phone-lobby.png` });
  await presenter.waitForTimeout(2000);
  await presenter.screenshot({ path: `${OUT}/m3-presenter-lobby.png` });

  await fac.getByRole("button", { name: "Start: Warm-up round" }).click();
  await fac.waitForTimeout(1500);
  await fac.getByRole("button", { name: "Start: Design" }).click();
  await phone.getByRole("button", { name: "Edit trigger" }).waitFor();
  await phone.getByRole("button", { name: "Edit trigger" }).click();
  await phone.getByRole("dialog").getByRole("textbox").fill("A driver posts the loaded truck photo in the dispatch WhatsApp group");
  await phone.getByRole("button", { name: "Snap it in" }).click();
  await phone.waitForTimeout(2000);
  await phone.screenshot({ path: `${OUT}/m3-phone-design.png` });
  await fac.waitForTimeout(2000);
  await fac.getByRole("button", { name: /The Fixers/ }).click();
  await fac.waitForTimeout(1000);
  await fac.screenshot({ path: `${OUT}/m3-console.png`, fullPage: true });
  await presenter.waitForTimeout(1500);
  await presenter.screenshot({ path: `${OUT}/m3-presenter-design.png` });
  await fac.getByRole("button", { name: "Start: Twist" }).click();
  await phone.getByText(/Twist! Something has changed/).waitFor({ timeout: 60000 });
  await presenter.getByText("Twist", { exact: true }).first().waitFor({ timeout: 60000 });
  await phone.waitForTimeout(1500);
  await phone.screenshot({ path: `${OUT}/m3-phone-twist.png` });
  await presenter.screenshot({ path: `${OUT}/m3-presenter-twist.png` });

  fac.once("dialog", (d) => d.accept());
  await fac.getByRole("button", { name: "End session" }).click();
  await fac.waitForTimeout(1500);
  console.log("done");
} finally {
  await browser.close();
}

import { expect, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54319";

async function latestLink(email: string, after: number): Promise<string | null> {
  const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`)).json();
  const latest = list.messages?.[0];
  if (!latest || new Date(latest.Created).getTime() < after - 2000) return null;
  const message = await (await fetch(`${MAILPIT}/api/v1/message/${latest.ID}`)).json();
  return (message.Text as string).match(/https?:\/\/\S+/)?.[0] ?? null;
}

// Signs in through the real magic-link flow, reading the email from the local
// test inbox. Only works against the local Supabase stack.
export async function signIn(page: Page, email = "facilitator@builda.test") {
  const before = Date.now();
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  let link: string | null = null;
  for (let i = 0; i < 20 && !link; i++) {
    link = await latestLink(email, before);
    if (!link) await page.waitForTimeout(250);
  }
  if (!link) throw new Error(`No magic link arrived for ${email}`);

  await page.goto(link);
  await page.waitForURL(/\/console/);
}

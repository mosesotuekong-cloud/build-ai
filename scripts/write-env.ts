// Writes the local Supabase URL and keys into .env.local, keeping any other
// values already there (such as ANTHROPIC_API_KEY). Run after `npm run db:start`.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const raw = execSync("npx supabase status -o env", { encoding: "utf8" });
const status = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => [m[1], m[2]]),
);

const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
if (!status.API_URL || !anonKey || !serviceKey) {
  console.error("Could not read the local Supabase keys. Is the stack running? Try `npm run db:start`.");
  process.exit(1);
}

const updates: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
};

const file = ".env.local";
const base = existsSync(file) ? readFileSync(file, "utf8") : readFileSync(".env.example", "utf8");
let lines = base.split(/\r?\n/);
for (const [key, value] of Object.entries(updates)) {
  const index = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else lines = [...lines, `${key}=${value}`];
}
writeFileSync(file, lines.join("\n"));
console.log(`Wrote local Supabase settings to ${file}.`);

# Deploying Builda

Everything below is done once, by Moses, in his own accounts. The app needs
three services: **Supabase** (database, sign-in, live updates), **Vercel**
(hosting) and an **email sender** for magic links. Choices that cost money
are marked; nothing is signed up for automatically.

## 1. Supabase (database and sign-in)

1. Create a project at supabase.com. Region: the closest to Lagos (EU West,
   for example). *Free tier works for pilots; Pro (about $25 a month; check current pricing) adds daily
   backups and no pausing, which you want before paid workshops.*
2. Link this repo and push the schema:
   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Authentication → URL configuration**
   - Site URL: `https://<your-app-domain>`
   - Redirect URLs: `https://<your-app-domain>/**`
4. **Authentication → Providers**: turn on **Anonymous sign-ins** (players
   join without accounts). Email (magic link) stays on.
5. **Authentication → Rate limits**: raise **anonymous sign-ins per hour**
   to at least 500. A whole room of phones shares one venue IP address.
6. **Email (SMTP)**: Supabase's built-in email is limited to a few emails an
   hour, which is not enough for real facilitators. Add an SMTP provider under
   **Authentication → Emails → SMTP settings**. *Resend, Postmark or Amazon SES
   all work; most have a free tier big enough for magic links.*
7. **Storage**: the `reports` bucket is created by the migrations. Nothing to do.
8. Load the library HR deck (production-safe: it creates no users, organisations
   or credits; `npm run db:seed` refuses to run against anything but your laptop):
   ```
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed:library
   ```

## 2. Vercel (hosting)

1. Import the repo at vercel.com. *Hobby is free but only for non-commercial
   use; paid workshops need Pro (about $20 a month; check current pricing).*
2. Add a domain, e.g. `app.<your-domain>`.
3. Environment variables (Production):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app-domain>` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |
   | `SUPER_ADMIN_EMAILS` | `otumosesjobs@gmail.com` |
   | `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | your AI key (secret) |
   | `AI_PROVIDER` | `auto` |
   | `N8N_WEBHOOK_BASE_URL` / `N8N_WEBHOOK_SECRET` | optional, for n8n jobs |
   | `DEMO_ENABLED` | `true` |
   | `DEMO_AI_UNITS` / `DEMO_DAILY_AI_UNITS` | `40` / `600` (raise once you see real usage) |
   | `DEMO_STARTS_PER_IP_PER_DAY` | `5` |
   | `DEMO_IP_SALT` | a long random string |

4. Deploy. Then sign in at `/login` with your email; you'll land in the
   console as super admin. Create client organisations at `/admin`.

## 3. The website

The Builda website (`C:\dev\builda-website`) deploys the same way on Vercel.
Set `NEXT_PUBLIC_DEMO_URL=https://<your-app-domain>/demo` there so its
"Try the demo" button appears.

## Before the first paid workshop

- Run a dry run with real phones on venue Wi-Fi (or a phone hotspot): join,
  design, twist, rank, reveal, report.
- Check the AI key has credit, and that the demo caps suit you (`/admin`
  shows today's demo AI use).
- Check magic-link emails arrive (and aren't in spam) from your SMTP sender.
- Turn on Supabase backups (Pro) or schedule `supabase db dump` yourself.

## Checks this repo runs

- `npm test`: unit tests
- `npm run test:rls`: row-level security against the local database
- `npm run test:e2e`: full sessions in real browsers (production build, mock AI)

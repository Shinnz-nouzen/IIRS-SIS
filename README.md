# School SIS

School information system built with Next.js, TypeScript, Tailwind CSS, and
Supabase.

## GitHub checks

The GitHub Actions workflow runs on every push and pull request. It installs
the locked npm dependencies and runs TypeScript, lint, validation/authorization
tests, and a production build. CI uses placeholder Supabase public settings
only; it does not connect to a Supabase project or apply database migrations.

## Local development

Create a local `.env.local` with the Supabase project URL and publishable key
provided by the project owner. Never put service-role keys or other secrets in
client-side configuration or commit environment files. Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Deployment

The CI workflow verifies code; it does not deploy the site. Choose and connect
a Next.js hosting provider before enabling deployment. The live Supabase
project must have its schema, staff authorization, and migration history
reviewed before any database migration is applied.

## Environment variables

The app reads exactly two variables (set them for Production and Preview in
Vercel, then redeploy because `NEXT_PUBLIC_*` values are inlined at build time):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never add a service-role key. A save failure shows a `Reference:` code that
matches a `Student create failed [CODE]` / `Student update failed [CODE]` line
in the Vercel function logs, with the Postgres error code and message.

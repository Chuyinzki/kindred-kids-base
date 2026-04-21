# Kindred Kids

Production-ready daycare attendance and reporting app for home daycare providers, now wired for subscription billing and provider account monetization.

## Live App

https://kindred-kids-base.vercel.app/

## What This App Does

- Manages provider and child records
- Tracks daily check-in/check-out attendance
- Supports kiosk mode for parent PIN workflows
- Generates monthly attendance PDFs from state-style templates
- Supports single and bulk report downloads
- Adds provider billing state, subscription gating, and Stripe-backed checkout/customer portal flows

## Tech Stack

- React + TypeScript + Vite
- Supabase (Auth, Postgres, RLS policies)
- Tailwind + shadcn/ui
- Vitest + Testing Library

## Security / Secrets

- No runtime secrets are committed in this repo.
- Environment values are loaded from `.env` (ignored by git).
- Use `.env.example` as your template.
- If this repo was private before and any secret was ever committed historically, rotate those credentials before going public.

## Environment Variables

Create `.env` from `.env.example`:

```env
VITE_SUPABASE_PROJECT_ID=your-supabase-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
```

Supabase Edge Functions env vars:

```env
APP_URL=https://your-app-domain.com
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Local Development

```bash
npm install
npm run dev
```

## Database Setup (Your Own Supabase)

1. Create a new Supabase project.
2. Link this repo:

```bash
supabase login
supabase link --project-ref <your-project-id>
```

3. Apply migrations:

```bash
supabase db push
```

Migrations live in `supabase/migrations`.

4. Deploy edge functions:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

5. Configure Stripe:
- Create one recurring monthly price for the `Starter` plan
- Set your Stripe customer portal configuration
- Point Stripe webhooks to `/functions/v1/stripe-webhook`

## Deploy (Vercel)

1. Import repo into Vercel
2. Set env vars:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `APP_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID_STARTER`
   - `STRIPE_WEBHOOK_SIGNING_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Build command: `npm run build`
4. Output directory: `dist`

## Testing

```bash
npm test
```

## Status

This repository is maintained as a public showcase of a real production-style app and ongoing improvements.

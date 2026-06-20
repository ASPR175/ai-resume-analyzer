# Resume Analyzer

AI-powered resume analysis SaaS. Users buy credits, upload their resume as a PDF, and get an instant AI-generated score with section-by-section feedback and prioritized improvements.

**Live demo:** [Resume Analyzer](https://ai-resume-analyzer-aspr175-e9uk4t964-aspr175s-projects.vercel.app)

## How it works

1. Sign up / sign in (Clerk)
2. Buy a credit pack (Stripe)
3. Upload a resume PDF (UploadThing)
4. Get an AI-generated analysis (Gemini) — score, section breakdown, top improvements
5. Re-analyze anytime, view full history of past analyses

Each analysis costs 1 credit. No subscriptions — pay only for what you use.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Auth | Clerk |
| Payments | Stripe (Checkout + Webhooks) |
| File uploads | UploadThing |
| AI | Google Gemini 2.5 Flash (structured JSON output) |
| PDF parsing | pdf2json |
| Database | NeonDB (Postgres) + Prisma ORM |
| UI | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

## Architecture

```
User signs up
  └─ Clerk webhook → creates User row in Postgres

User buys credits
  └─ Stripe Checkout session created (server-side)
  └─ Stripe webhook (checkout.session.completed)
      └─ idempotent write: CreditPurchase row + User.credits incremented
         (atomic via Prisma $transaction)

User uploads + analyzes resume
  └─ PDF uploaded directly to UploadThing (client-side)
  └─ fileUrl sent to /api/analyze
      └─ credit check → PDF downloaded → text extracted (pdf2json)
      └─ Gemini call with a strict JSON response schema
      └─ on success: credit deducted + Analysis row marked COMPLETED (atomic)
      └─ on failure: Analysis row marked FAILED, credit not deducted
```

## Database schema

Three models:

- **User** — Clerk-synced identity, credit balance, Stripe customer ID
- **Analysis** — one row per resume analysis: file info, extracted text, AI result (JSON), status (`PENDING` / `COMPLETED` / `FAILED`)
- **CreditPurchase** — audit trail of every Stripe payment, keyed on `stripeSessionId` for webhook idempotency

See [`prisma/schema.prisma`](./prisma/schema.prisma) for the full schema.

## Key engineering decisions

- **Idempotent webhooks** — both Clerk and Stripe webhooks use `upsert` / unique-constraint checks so duplicate event delivery never double-credits a user or crashes on a re-fired event.
- **Atomic credit operations** — every credit deduction or addition is wrapped in a `prisma.$transaction`, so a partial failure can never leave credits and records out of sync.
- **Fail-safe analysis** — credits are only deducted *after* a successful Gemini response. If parsing or the AI call fails, the user keeps their credit and the failure is logged on the `Analysis` row for debugging.
- **Structured AI output** — Gemini is called with a `responseSchema` (not just a "respond in JSON" prompt) to guarantee parseable, consistently-shaped output.

## Local development

### Prerequisites

- Node.js 18+
- A NeonDB project
- Clerk, Stripe, UploadThing, and Gemini API accounts/keys
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook testing)

### Setup

```bash
git clone https://github.com/ASPR175/ai-resume-analyzer.git
cd resume-analyzer
npm install
```

Create `.env` with:

```env
# Database
DATABASE_URL="postgresql://..."      # pooled connection
DIRECT_URL="postgresql://..."        # direct connection (for migrations)

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Gemini
GEMINI_API_KEY="..."

# UploadThing
UPLOADTHING_TOKEN="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Push the schema:

```bash
npx prisma db push
npx prisma generate
```

Run three processes in parallel:

```bash
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe
ngrok http 3000   # for Clerk webhook in dev
```

Register webhook endpoints (Clerk dashboard + Stripe dashboard) pointing to your ngrok URL, and paste the resulting signing secrets into `.env`.

## Deployment

1. Push to GitHub, connect the repo to Vercel
2. Add all env vars above to Vercel (production NeonDB URL, live or test Stripe/Clerk keys)
3. Deploy and grab the production URL
4. Re-register both webhooks (Clerk + Stripe) with the production URL
5. Update `STRIPE_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` in Vercel with the new values
6. Redeploy

## License

MIT

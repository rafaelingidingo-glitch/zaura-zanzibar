# ZAURA ZANZIBAR

Luxury accommodation website + WhatsApp-based booking management system for **Zaura Zanzibar** (Zanzibar, Tanzania).

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma ORM and PostgreSQL (Neon).

---

## Features

### Public website (single-page experience at `/`)
- Cinematic photography-led hero with rotating imagery
- Elegant booking search bar (dates, adults, children, accommodation type)
- Editorial brand introduction, accommodation collection, Zanzibar experience
- Amenities & facilities (admin-configurable, only active amenities shown)
- Asymmetric gallery with categories + full-screen lightbox
- Location & contact with WhatsApp lines and contact form
- Instagram reel embed (configurable)
- Request-to-book booking wizard with live availability:
  1. Dates → 2. Category + individual apartment selection → 3. Guest details → 4. Summary
  5. Save booking (status `PENDING`) + open WhatsApp with a prefilled message
- Unique booking reference: `ZZA-2026-0001`
- SEO: metadata, Open Graph, JSON-LD structured data, sitemap.xml, robots.txt

### Admin dashboard (`/#admin` or "Staff Access" in the footer)
- Secure authentication (JWT session in httpOnly cookie, bcrypt passwords)
- Overview: reservations, pending requests, today's check-ins/outs, unit availability, monthly revenue, booking trend
- Reservation management: confirm (concurrency-safe, re-checks availability in a transaction), reject, cancel, extend hold, check-in, check-out, no-show, internal notes, record payments, contact guest via WhatsApp
- Availability calendar: day / week / month views per unit
- Apartment management: categories + individual units (numbers, pricing, occupancy, amenities, images, maintenance blocking, activation)
- Amenity, gallery and website content management (all text editable)
- Guest CRM with search and reservation history
- Analytics & reporting with CSV export + print-to-PDF
- Settings: WhatsApp contacts, primary booking contact, hold duration, currency, hero content, Instagram, location, house rules, password

### Booking engine guarantees
- Pending requests temporarily hold the selected unit (default 15 minutes, configurable)
- Expired holds release inventory automatically (lazy expiry on every availability read + Vercel Cron every 5 minutes)
- Confirmed bookings prevent overlapping reservations; check-out day never conflicts with a new check-in
- Double-booking prevention uses a serializable transaction at creation AND at confirmation
- Duplicate submissions are protected via idempotency keys
- Rate limiting on booking, login and contact endpoints
- Timezone-safe calendar logic (property timezone: Africa/Dar_es_Salaam)

---

## Local development

```bash
bun install
bun run db:push      # push Prisma schema to the database
bun run db:seed      # seed admin user, settings, sample content
bun run dev          # start Next.js on :3000
```

Seeded admin credentials (change immediately):
- Email: `admin@zaurazanzibar.com`
- Password: `Zaura@Admin2026` (from `ADMIN_PASSWORD` env)

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection (pooler endpoint, `sslmode=require`) |
| `DIRECT_URL` | Direct (non-pooler) Neon endpoint used by Prisma CLI |
| `AUTH_SECRET` | HMAC secret for admin session JWTs |
| `CRON_SECRET` | Shared secret protecting `/api/cron/expire-bookings` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed credentials for the first admin user |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used for metadata/sitemap |

A complete `.env.example` is included.

## Deploying to Vercel

1. Push this repository to GitHub and import it in Vercel.
2. Set all environment variables above in **Project → Settings → Environment Variables** (Production + Preview).
3. Deploy. `vercel.json` registers the cron job `/api/cron/expire-bookings` (every 5 minutes) automatically — Vercel injects the `Authorization: Bearer CRON_SECRET` header itself.
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain before going live.

Notes:
- Uploaded images are stored in PostgreSQL and served via `/api/images/[id]`, so image uploads work on serverless with no external storage.
- The in-memory rate limiter is per-instance; for strict global limits add a shared store later if needed.
- Sample seed content (categories, apartments, prices, texts) is placeholder data for the administrator to replace — nothing about inventory or pricing is hardcoded in the application.

# ATIB Fan Zone · World Cup 2026 — Ticketing & Check‑in

An internal system for ATIB's World Cup 2026 "Fan Zone" events. Employees reserve a ticket with their work email and receive a unique QR code; door staff scan the QR to register attendance live across Tripoli, Benghazi, and Misrata over eight match nights.

The experience is deliberately built around two football moments: opening your ticket feels like ripping a sticker pack, and getting scanned at the door triggers a goal celebration.

## Documentation
Read in this order:

1. [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — what we're building and why, with the decisions already made.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, tech stack, data flow, deployment.
3. [docs/DATA-MODEL.md](docs/DATA-MODEL.md) — tables, relationships, and the function (API) contract.
4. [docs/DESIGN.md](docs/DESIGN.md) — the visual system and the two signature animations.
5. [docs/SECURITY.md](docs/SECURITY.md) — data handling, access control, and bank/compliance notes.
6. [docs/ROADMAP.md](docs/ROADMAP.md) — phased plan, milestones, and the critical path to launch.
7. [SETUP.md](SETUP.md) — step‑by‑step to stand the system up.
8. [docs/GIT.md](docs/GIT.md) — git commands we use day to day.

## File layout
```
atib-ticketing/
├── README.md            ← you are here
├── SETUP.md             ← deployment / operations guide
├── schema.sql           ← full database (run in Supabase)
├── .env.local.example   ← Supabase keys (copy to .env.local)
├── package.json         ← Next.js app
├── app/
│   ├── layout.tsx       ← fonts + global shell
│   ├── globals.css      ← design system (see docs/DESIGN.md)
│   ├── page.tsx         ← employee app: RSVP → pack-reveal ticket
│   ├── scan/page.tsx    ← door scanner (camera + manual fallback)
│   └── dashboard/page.tsx ← live attendance + admin
├── components/StaffGate.tsx ← staff sign-in wrapper
├── lib/
│   ├── supabase.ts      ← client + typed API wrappers
│   └── celebrate.ts     ← synthesized sound + confetti
└── docs/
    ├── REQUIREMENTS.md
    ├── ARCHITECTURE.md
    ├── DATA-MODEL.md
    ├── DESIGN.md
    ├── SECURITY.md
    └── ROADMAP.md
```

## Status at a glance
- **Done:** requirements, architecture, database schema (`schema.sql`), and the full **Next.js** frontend — employee RSVP + ticket, door scanner, and live dashboard/admin.
- **Next:** stand up Supabase, import the employee list, deploy, and end-to-end test (see [SETUP.md](SETUP.md)).
- See [docs/ROADMAP.md](docs/ROADMAP.md) for the full picture and timeline.

## Stack in one line
A single **Next.js** app (App Router, client-rendered) talking to a managed **Supabase** backend (PostgreSQL + Auth), with all data access funnelled through locked‑down database functions.

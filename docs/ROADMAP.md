# Roadmap

## 1. Timeline reality
Today is **08 June 2026**; the first match night is **11 June 2026** — three days away. The full system is achievable in that window because the foundation is already built, **but only if the prerequisites that aren't code (Supabase project, employee list import, IT/compliance sign‑off) move in parallel starting now.** This plan is organised around the critical path to night one, with a defined fallback if anything slips.

## 2. Phases

### Phase 0 — Foundation ✅ (done)
- Requirements, architecture, data model, design, security docs.
- `schema.sql` (tables, RLS, seeded 8×3 events, API + admin functions).

### Phase 1 — Frontend ✅ (built) + go-live tasks (critical path)
Goal: an employee can register and a door can check them in, live.

Code ✅ (the **Next.js** app — `app/page.tsx`, `app/scan`, `app/dashboard`):
- [x] Employee RSVP → pack‑reveal ticket with QR.
- [x] Scanner — staff sign‑in, city + night selector, camera scan, GOAL/duplicate/invalid results, manual fallback entry.
- [x] Dashboard — stat tiles, night × city matrix, ~8s live refresh, ticket admin (resend / revoke / roster export).

Go-live (not code — must move in parallel now, see SETUP.md):
- [ ] **Stand up Supabase** project + run `schema.sql`. *(you / IT)*
- [ ] **Import the employee list** into `employees`. *(you)*
- [ ] Set env vars + **deploy** the Next.js app (Vercel/Netlify). *(you)*
- [ ] Create **staff accounts** for each door. *(you)*
- [ ] **End‑to‑end test** with a handful of real emails before 20:00 on the 11th. *(together)*

### Phase 2 — Polish & resilience (by the early nights)
- [ ] Per‑venue connectivity check and printed fallback rosters prepared (roster CSV export already serves as the offline list).
- [ ] Dashboard polish / Supabase real‑time upgrade if polling proves insufficient.

### Phase 3 — Enhancements (post‑launch / if time allows)
- [ ] Emailing tickets (Supabase Edge Function + email provider).
- [ ] Apple / Google Wallet passes (needs a pass certificate or pass service).
- [ ] Arabic / RTL localisation.
- [ ] "Stadium fills up" big‑screen view for the venues.
- [ ] Rate‑limiting hardening on `rsvp_register`.

## 3. Ownership split
| You / ATIB IT | Me |
|---|---|
| Create Supabase project, run schema | Build the Next.js app + admin functions ✅ |
| Import & sanity‑check the employee list | Wire everything to the schema; keep docs current |
| Deploy hosting + set env vars | Provide test steps and fallback exports |
| Create staff logins; IT/compliance sign‑off | Localization / enhancements on request |

## 4. Definition of done for night one
Registration rejects non‑listed emails and issues a working QR; a staff phone signs in, selects Tripoli + 11 June, scans a ticket, and sees a successful check‑in; a second scan of the same ticket is flagged as duplicate; the dashboard shows the count rising.

## 5. Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| 3‑day window slips | Medium | Phase 1 is intentionally the smallest end‑to‑end slice; Phase 2/3 can follow after night one. |
| Compliance pushback on cloud | Low–Med | SECURITY.md is written to support a fast sign‑off (minimal data, locked tables, deletion plan); the data layer is isolated enough to swap if ever needed. |
| No connectivity at a door | Medium | `event_roster` export → printed list for manual ticking; reconcile after. Test coverage per venue beforehand. |
| Messy employee list | Medium | Validate `home_city` values and email formatting on import; fix before go‑live. |

## 6. Immediate next step
Either: I build **`scan.html` + a minimal dashboard** now so the code is ready, while you stand up Supabase in parallel — then we test end to end. That is the fastest route to a working night one.

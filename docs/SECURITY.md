# Security & privacy

This is an internal bank system handling employee data, so security is treated as a first‑class requirement rather than an afterthought.

## 1. Data handled
| Data | Classification | Where |
|---|---|---|
| Employee name, email, branch, employee no. | Internal / confidential PII | `employees` (private) |
| Ticket token | Secret‑ish (capability) | `tickets` |
| Attendance records | Internal | `attendance` |
| Staff accounts | Internal | Supabase Auth + `staff` |

No financial data, credentials, or government IDs are stored. Data is minimised to what the event needs.

## 2. Access‑control model
- **Every table has Row Level Security enabled with no broad policies**, so the public API key cannot read or write tables directly.
- All functionality is exposed through a few `SECURITY DEFINER` functions that enforce their own rules. This is the core of the model: the attack surface is four well‑understood functions, not a set of tables.
- **Public (anonymous)** can do exactly two things: register by email (`rsvp_register`) and view a ticket by its token (`get_ticket`). Neither can enumerate the directory.
- **Staff (authenticated via Supabase Auth)** can check people in (`check_in`) and read aggregate counts (`get_counts`); these functions reject any caller not present in the `staff` table.
- **Roles** in `staff` (`scanner` vs `admin`) gate scanner vs dashboard/admin capabilities.

## 3. The "public anon key" — why it's safe
Supabase's anon key is designed to be shipped in client code. On its own it grants nothing here, because Row Level Security blocks direct table access and the only callable surface is the vetted functions. Security rests on RLS + function logic, not on hiding the key.

## 4. Token design
- The QR carries an **opaque random token**, never personal data, so a leaked or photographed QR reveals nothing by itself.
- One token per employee (`tickets.employee_id` is unique); registration is idempotent, so re‑registering can't mint extra tickets.
- Tokens are **revocable** (`revoked` flag) and checked on both viewing and check‑in.

## 5. Threats & mitigations
| Threat | Mitigation |
|---|---|
| Directory enumeration / scraping emails | Directory is never readable; `rsvp_register` only confirms a match, and should be rate‑limited (see §6). |
| Forged / guessed QR | Tokens are long and random; check‑in validates against the database and rejects unknowns. |
| Double counting / replay | DB‑level uniqueness on `(ticket_id, event_id)`; duplicates are reported, not recorded twice. |
| Unauthorised check‑in or dashboard access | Staff‑only functions verify `staff` membership; pages require Supabase Auth sign‑in. |
| Ticket sharing between employees | One ticket = one employee; the door greets by name, and home‑city mismatches are flagged for staff awareness. |
| Key/page leakage | Anon key grants no table access; no secrets (service key) live in the static pages. |

## 6. Hardening recommendations (before/at launch)
- **Rate‑limit** `rsvp_register` (e.g. via a lightweight per‑IP throttle / Supabase edge limit) to blunt email‑probing.
- Enforce **strong staff passwords** and remove staff accounts after the event.
- Keep the **service‑role key** out of all client code (it never appears in this project) and store it only in Supabase.
- Restrict the Supabase project's allowed origins to your hosting domain.

## 7. Privacy & retention
- Choose a **data region** appropriate to bank policy when creating the project.
- Define a **retention period**: after the event, export any needed attendance summary and **delete the personal data** (directory, tickets) from the project.
- Collect no more than necessary; an employee photo on the card is optional and only added if confirmed.

## 8. Compliance note
Because this touches employee PII on an external cloud, get a brief **sign‑off from IT/compliance** on: the chosen region, the retention/deletion plan, and using a managed cloud backend at all. The architecture is built to make that conversation easy — minimal data, locked tables, clear deletion path.

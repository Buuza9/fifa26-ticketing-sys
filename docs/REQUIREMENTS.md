# Requirements

## 1. Background
ATIB is running internal "Fan Zone" events to watch the FIFA World Cup 2026 at the workplace. Employees need a ticket with a unique QR code, and attendance is registered by scanning that code at the door. Events run over eight nights across three cities.

| City | Venue | Nights (June 2026) | Time |
|---|---|---|---|
| Tripoli (HQ) | Cafeteria + Parking | 11, 13, 15, 16, 19, 21, 26, 28 | from 20:00 |
| Benghazi | Meeting Room | 11, 13, 15, 16, 19, 21, 26, 28 | from 20:00 |
| Misrata | Meeting Room | 11, 13, 15, 16, 19, 21, 26, 28 | from 20:00 |

## 2. Functional requirements
- **FR‑1 Registration (RSVP):** an employee reserves a ticket by entering their ATIB work email. The system matches the email against the employee directory and only then issues a ticket. Emails not on the directory are rejected with a clear message.
- **FR‑2 Unique ticket:** each registered employee receives exactly one ticket carrying a unique, unguessable QR code, valid for all eight nights.
- **FR‑3 Digital delivery:** the ticket is delivered digitally — a personal web page (savable / shareable by link), with an emailed copy and Wallet passes as later options.
- **FR‑4 Check‑in:** at the venue, authorised staff scan the QR with a phone. A valid scan registers attendance for that night and city, greeting the person by name.
- **FR‑5 Duplicate handling:** scanning the same ticket twice on the same night is recognised and not double‑counted.
- **FR‑6 Multi‑site context:** a scan is recorded against the correct night and city; if someone checks in at a city other than their home branch, it is allowed but flagged.
- **FR‑7 Live dashboard:** organisers can see attendance per night and per city, total tickets issued, and unique attendees.
- **FR‑8 Administration:** organisers can import the employee list, and resend or revoke a ticket.

## 3. Non‑functional requirements
- **NFR‑1 Mobile‑first & mobile‑data:** all employee and scanner screens work on a phone, including over cellular data (the Tripoli parking area may lack internal Wi‑Fi).
- **NFR‑2 Shared, near‑real‑time state:** every scanner across the three cities and the dashboard read and write the same data, with no double‑counting.
- **NFR‑3 Security & privacy:** employee data is protected; the directory is never publicly readable; only authorised staff can check people in or view attendance. See SECURITY.md.
- **NFR‑4 Low operational burden:** minimal moving parts, no server to maintain, quick to stand up and hand over.
- **NFR‑5 Scale:** correct for any realistic headcount (hundreds to a few thousand employees) and concurrent door scanning.
- **NFR‑6 Resilience:** a clear, fast fallback if connectivity drops at a door (see ROADMAP risks).

## 4. Out of scope (for the first release)
Native mobile apps; payments or paid tickets; family/guest tickets (employees only); automated bulk email sending; Apple/Google Wallet passes; full Arabic localisation. Several of these are candidates for a later phase (see ROADMAP.md).

## 5. Assumptions & open questions
- **Localisation:** the UI is English first. Arabic / RTL is a likely desirable option given the audience — to confirm.
- **Headcount:** exact employee count to confirm (does not change the architecture; helps sizing/testing).
- **Ownership:** who administers during the event (imports the list, handles resends) — to confirm.
- **Card photo:** whether to show an employee photo on the ticket card (nice, but adds a data/source requirement) — to confirm; defaulting to no photo.
- **Connectivity at venues:** confirm cellular coverage at each door, especially Tripoli parking.

## 6. Decisions log (already agreed)
| # | Decision |
|---|---|
| D‑1 | One QR per employee, valid for all 8 nights; attendance logged per night at scan time. |
| D‑2 | Issuance is **RSVP‑first**: employee registers by work email, matched to the directory. |
| D‑3 | Backend is a **managed cloud** service — Supabase (PostgreSQL + Auth). |
| D‑4 | Delivery is fully **digital** (web ticket now; email + Wallet later). |
| D‑5 | Door staff **scan with their own phones**. |
| D‑6 | Branding uses **generic football motifs**, not official FIFA marks, to stay trademark‑safe. |

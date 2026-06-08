# Setup & operations

Step-by-step to stand the system up. Order matters: Supabase first, then the
employee list, then deploy.

## 0. Prerequisites
- Node.js 18+ and npm.
- A Supabase account (free tier is fine).
- The repo cloned locally (`git clone https://github.com/Buuza9/fifa26-ticketing-sys.git`).

## 1. Create the Supabase project
1. Create a new project. **Pick a data region appropriate to bank policy** (see docs/SECURITY.md §7).
2. Note the project's **URL** and **anon (public) key** from Project Settings → API.
3. Keep the **service-role key** secret — it is never used in this app.

## 2. Apply the database
1. Open the Supabase **SQL editor**.
2. Paste the entire contents of [`schema.sql`](schema.sql) and run it once.
3. This creates the tables, enables Row Level Security, seeds the 8×3 events,
   and installs the API + admin functions.

## 3. Import the employee directory
Import your eligibility list into `employees`. Required columns: `name`,
`email`, `home_city` (one of `Tripoli` / `Benghazi` / `Misrata`); `emp_no` is
optional. Two easy ways:
- **Table editor → Import CSV** into `employees`, or
- An `insert` in the SQL editor.

Validate `home_city` spelling and email formatting before go-live (see
docs/ROADMAP.md risks).

## 4. Create staff accounts
For each door/organiser:
1. **Authentication → Users → Add user** (email + password).
2. Then link them in the `staff` table (SQL editor), using their auth user id:
   ```sql
   insert into public.staff (id, display_name, role, assigned_city)
   values ('<auth-user-uuid>', 'Door – Tripoli', 'scanner', 'Tripoli');
   ```
   Use `role = 'admin'` for organisers who need revoke/restore. Only members of
   `staff` can check people in or read counts.

## 5. Configure and run locally
```bash
npm install
cp .env.local.example .env.local      # then fill in your URL + anon key
npm run dev                           # http://localhost:3000
```
Routes: `/` (employee), `/scan` (door staff), `/dashboard` (organisers).

## 6. Deploy
Deploy to **Vercel** or **Netlify**:
1. Connect the GitHub repo.
2. Set environment variables `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the host's project settings.
3. Build command `npm run build` (auto-detected for Next.js).
4. In Supabase → Authentication → URL config and API settings, restrict allowed
   origins to your deployed domain (see docs/SECURITY.md §6).

## 7. End-to-end test (before 20:00 on the 11th)
1. Register a handful of **real** test emails at `/` → confirm a QR renders.
2. Confirm a non-listed email is rejected with a clear message.
3. At `/scan`, sign in as staff, pick **Tripoli + 11 June**, scan a ticket →
   see **GOAL!** and the name.
4. Scan the same ticket again → **already checked in** (no double count).
5. Open `/dashboard` → the count rises within ~8s (auto-refresh).
6. Export a roster CSV → this doubles as the **offline fallback list**.

## 8. Operating during the event
- **Lost ticket:** the employee reopens `/` with the same email (idempotent), or
  an organiser uses **Copy link** on the dashboard.
- **Revoke a ticket:** dashboard → paste token → Revoke (admin role).
- **No connectivity at a door:** use the exported roster CSV for manual ticking,
  reconcile after. Run a per-venue connectivity check beforehand.

## 9. After the event
Export any needed attendance summary, then **delete the personal data**
(directory, tickets) per the retention plan and remove staff accounts
(docs/SECURITY.md §7).

import { createClient } from "@supabase/supabase-js";

// Single browser Supabase client, shared by all pages.
// Both values are public (anon key); all real access control lives in the
// database (RLS + SECURITY DEFINER functions). See docs/SECURITY.md.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Surfaced at runtime so a missing .env.local fails loudly, not silently.
  // eslint-disable-next-line no-console
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.local.example to .env.local."
  );
}

// A syntactically valid placeholder keeps `next build` prerendering from
// crashing when env vars are absent (e.g. CI without .env.local). At runtime
// the real NEXT_PUBLIC_* values are inlined at build time; a real deploy must
// set them before building.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true } }
);

// ---- Typed wrappers over the four-function API surface (docs/DATA-MODEL.md) --

export type RsvpResult =
  | { status: "ok" | "exists"; token: string; name: string; emp_no: string | null; city: string }
  | { status: "not_found" };

export type TicketResult =
  | { status: "ok"; name: string; emp_no: string | null; city: string; token: string }
  | { status: "revoked" | "invalid" };

export type CheckInResult =
  | { status: "ok"; name: string; home_city: string; mismatch: boolean }
  | { status: "duplicate"; name: string; time: string }
  | { status: "invalid" | "revoked" | "no_event" | "unauthorized" };

export type CountsRow = { event_date: string; city: string; cnt: number };
export type CountsResult =
  | { status: "ok"; issued: number; attendees: number; rows: CountsRow[] }
  | { status: "unauthorized" };

export type RosterRow = {
  name: string;
  emp_no: string | null;
  home_city: string;
  scanned_at: string;
  mismatch: boolean;
};

async function rpc<T>(fn: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data as T;
}

export const api = {
  rsvpRegister: (email: string) => rpc<RsvpResult>("rsvp_register", { p_email: email }),
  getTicket: (token: string) => rpc<TicketResult>("get_ticket", { p_token: token }),
  checkIn: (token: string, date: string, city: string) =>
    rpc<CheckInResult>("check_in", { p_token: token, p_date: date, p_city: city }),
  getCounts: () => rpc<CountsResult>("get_counts"),
  resendTicket: (email: string) =>
    rpc<RsvpResult>("resend_ticket", { p_email: email }),
  revokeTicket: (token: string) => rpc<{ status: string }>("revoke_ticket", { p_token: token }),
  restoreTicket: (token: string) => rpc<{ status: string }>("restore_ticket", { p_token: token }),
  eventRoster: (date: string, city: string) =>
    rpc<{ status: string; rows: RosterRow[] }>("event_roster", { p_date: date, p_city: city }),
};

// The eight nights and three cities, mirroring the seed in schema.sql.
export const NIGHTS = [
  "2026-06-11", "2026-06-13", "2026-06-15", "2026-06-16",
  "2026-06-19", "2026-06-21", "2026-06-26", "2026-06-28",
];
export const CITIES = ["Tripoli", "Benghazi", "Misrata"] as const;
export const VENUE: Record<string, string> = {
  Tripoli: "Cafeteria + Parking",
  Benghazi: "Meeting Room",
  Misrata: "Meeting Room",
};

// A stable, friendly "FAN ###" number derived from the name (display only).
export function fanNumber(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return String((h % 999) + 1).padStart(3, "0");
}

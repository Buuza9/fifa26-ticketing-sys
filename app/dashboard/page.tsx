"use client";

import { useCallback, useEffect, useState } from "react";
import { api, CITIES, NIGHTS, type CountsResult, type RosterRow } from "@/lib/supabase";
import StaffGate, { SignOutButton } from "@/components/StaffGate";

function Dashboard() {
  const [counts, setCounts] = useState<Extract<CountsResult, { status: "ok" }> | null>(null);
  const [err, setErr] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [revokeToken, setRevokeToken] = useState("");
  const [rosterCity, setRosterCity] = useState<string>(CITIES[0]);
  const [rosterNight, setRosterNight] = useState<string>(NIGHTS[0]);

  const load = useCallback(async () => {
    try {
      const r = await api.getCounts();
      if (r.status === "unauthorized") {
        setErr("Your account isn't authorised to view the dashboard.");
        setCounts(null);
      } else {
        setErr("");
        setCounts(r);
      }
    } catch {
      setErr("Could not load counts — retrying…");
    }
  }, []);

  // Live refresh: poll get_counts on a short interval (docs/ARCHITECTURE.md §6).
  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  // Build a quick lookup for the night × city matrix.
  const cell = (date: string, city: string) =>
    counts?.rows.find((r) => r.event_date === date && r.city === city)?.cnt ?? 0;

  const resend = async () => {
    setAdminMsg("");
    const r = await api.resendTicket(resendEmail.trim());
    if (r.status === "ok" || r.status === "exists") {
      const link = `${window.location.origin}/?t=${encodeURIComponent(r.token)}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      setAdminMsg(`Link for ${r.name} copied: ${link}`);
    } else {
      setAdminMsg("No ticket found for that email.");
    }
  };

  const setRevoked = async (revoke: boolean) => {
    setAdminMsg("");
    const r = revoke
      ? await api.revokeTicket(revokeToken.trim())
      : await api.restoreTicket(revokeToken.trim());
    setAdminMsg(
      r.status === "ok" ? `Ticket ${revoke ? "revoked" : "restored"}.`
      : r.status === "unauthorized" ? "Admin role required."
      : "Ticket not found."
    );
  };

  const exportRoster = async () => {
    setAdminMsg("");
    const r = await api.eventRoster(rosterNight, rosterCity);
    if (r.status !== "ok") { setAdminMsg("Could not load roster."); return; }
    const rows: RosterRow[] = r.rows;
    const header = "name,emp_no,home_city,scanned_at,away_fan";
    const body = rows.map((x) =>
      [x.name, x.emp_no ?? "", x.home_city, x.scanned_at, x.mismatch ? "yes" : ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roster-${rosterCity}-${rosterNight}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setAdminMsg(`Exported ${rows.length} attendee(s).`);
  };

  return (
    <main className="app wide">
      <header className="brand">
        <span className="dot" />
        <span className="name">Live dashboard</span>
        <span className="spacer" />
        <SignOutButton />
      </header>

      {err && <p className="msg error">{err}</p>}

      <section className="tiles">
        <div className="tile"><p className="label">Tickets issued</p><div className="num">{counts?.issued ?? "—"}</div></div>
        <div className="tile"><p className="label">Unique attendees</p><div className="num">{counts?.attendees ?? "—"}</div></div>
        <div className="tile"><p className="label">Total check-ins</p><div className="num">{counts ? counts.rows.reduce((s, r) => s + r.cnt, 0) : "—"}</div></div>
        <div className="tile"><p className="label">Cities live</p><div className="num">{CITIES.length}</div></div>
      </section>

      <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
        <p className="label">Attendance · night × city</p>
        <table className="matrix">
          <thead>
            <tr>
              <th>Night</th>
              {CITIES.map((c) => <th key={c}>{c}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {NIGHTS.map((d) => {
              const total = CITIES.reduce((s, c) => s + cell(d, c), 0);
              return (
                <tr key={d}>
                  <td>{d.slice(5)} June</td>
                  {CITIES.map((c) => {
                    const v = cell(d, c);
                    return <td key={c} className={v > 0 ? "hot" : "muted"}>{v}</td>;
                  })}
                  <td className={total > 0 ? "hot" : "muted"}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card stack" style={{ marginTop: 18 }}>
        <p className="label">Ticket admin</p>

        <div className="row">
          <input type="email" placeholder="resend: employee email" value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)} />
          <button className="btn" style={{ flex: "0 0 auto", width: "auto", padding: "12px 16px" }} onClick={resend}>
            Copy link
          </button>
        </div>

        <div className="row">
          <input type="text" placeholder="ticket token" value={revokeToken}
            onChange={(e) => setRevokeToken(e.target.value)} />
          <button className="btn ghost" style={{ flex: "0 0 auto", width: "auto", padding: "12px 16px" }} onClick={() => setRevoked(true)}>
            Revoke
          </button>
          <button className="btn ghost" style={{ flex: "0 0 auto", width: "auto", padding: "12px 16px" }} onClick={() => setRevoked(false)}>
            Restore
          </button>
        </div>

        <div className="row">
          <select value={rosterCity} onChange={(e) => setRosterCity(e.target.value)}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={rosterNight} onChange={(e) => setRosterNight(e.target.value)}>
            {NIGHTS.map((n) => <option key={n} value={n}>{n.slice(5)} June</option>)}
          </select>
          <button className="btn" style={{ flex: "0 0 auto", width: "auto", padding: "12px 16px" }} onClick={exportRoster}>
            Export roster (CSV)
          </button>
        </div>

        {adminMsg && <p className="msg ok" style={{ wordBreak: "break-all" }}>{adminMsg}</p>}
      </section>

      <p className="label center" style={{ marginTop: 20, opacity: 0.6 }}>
        Auto-refreshing every 8s · CSV export doubles as the offline fallback list
      </p>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <StaffGate>
      <Dashboard />
    </StaffGate>
  );
}

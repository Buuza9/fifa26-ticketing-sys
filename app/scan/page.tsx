"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api, CITIES, NIGHTS, type CheckInResult } from "@/lib/supabase";
import { confetti, crowdRoar, setMuted } from "@/lib/celebrate";
import StaffGate, { SignOutButton } from "@/components/StaffGate";

type Banner =
  | { kind: "goal"; name: string; mismatch: boolean }
  | { kind: "dupe"; name: string; time: string }
  | { kind: "bad"; text: string }
  | null;

function todayOrFirst(): string {
  const t = new Date().toISOString().slice(0, 10);
  return NIGHTS.includes(t) ? t : NIGHTS[0];
}

function Scanner() {
  const [city, setCity] = useState<string>(CITIES[0]);
  const [night, setNight] = useState<string>(todayOrFirst());
  const [scanning, setScanning] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [tonight, setTonight] = useState(0);
  const [manual, setManual] = useState("");
  const [muted, setMutedState] = useState(false);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false); // debounce repeated decodes of the same frame

  const resolve = useCallback(async (token: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      const r: CheckInResult = await api.checkIn(token, night, city);
      if (r.status === "ok") {
        setBanner({ kind: "goal", name: r.name, mismatch: r.mismatch });
        setTonight((n) => n + 1);
        confetti();
        if (!muted) crowdRoar();
      } else if (r.status === "duplicate") {
        setBanner({ kind: "dupe", name: r.name, time: r.time });
      } else {
        const map: Record<string, string> = {
          invalid: "Unknown ticket — not recognised.",
          revoked: "This ticket has been revoked.",
          no_event: "No event for this city + night.",
          unauthorized: "Your account isn't authorised to check people in.",
        };
        setBanner({ kind: "bad", text: map[r.status] ?? "Rejected." });
      }
    } catch {
      setBanner({ kind: "bad", text: "Network error — try again." });
    } finally {
      // Brief cooldown so one QR in frame doesn't fire repeatedly.
      setTimeout(() => (lockRef.current = false), 1800);
    }
  }, [night, city, muted]);

  const startCamera = useCallback(async () => {
    setBanner(null);
    const el = document.getElementById("reader");
    if (!el) return;
    const q = new Html5Qrcode("reader");
    qrRef.current = q;
    try {
      await q.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => resolve(decoded),
        () => {}
      );
      setScanning(true);
    } catch {
      setBanner({ kind: "bad", text: "Could not open the camera. Use manual entry below." });
    }
  }, [resolve]);

  const stopCamera = useCallback(async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch { /* ignore */ }
      try { await qrRef.current.clear(); } catch { /* ignore */ }
      qrRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  const toggleMute = () => {
    const v = !muted;
    setMutedState(v);
    setMuted(v);
  };

  return (
    <main className="app">
      <header className="brand">
        <span className="dot" />
        <span className="name">Door scanner</span>
        <span className="spacer" />
        <button onClick={toggleMute} className="label" style={{ background: "none", border: "none", cursor: "pointer", marginRight: 10 }}>
          {muted ? "🔇" : "🔊"}
        </button>
        <SignOutButton />
      </header>

      <section className="card stack">
        <div className="row">
          <div>
            <p className="label">City</p>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p className="label">Night</p>
            <select value={night} onChange={(e) => setNight(e.target.value)}>
              {NIGHTS.map((n) => <option key={n} value={n}>{n.slice(5)} June</option>)}
            </select>
          </div>
        </div>
        <p className="label center">Checked in tonight: <span style={{ color: "var(--gold)" }}>{tonight}</span></p>
      </section>

      <div id="reader" style={{ marginTop: 16, minHeight: scanning ? undefined : 0 }} />

      <div style={{ marginTop: 14 }}>
        {!scanning ? (
          <button className="btn" onClick={startCamera}>Start scanning</button>
        ) : (
          <button className="btn ghost" onClick={stopCamera}>Stop camera</button>
        )}
      </div>

      {banner && (
        <div className={`result-banner ${banner.kind === "goal" ? "goal" : banner.kind === "dupe" ? "dupe" : "bad"}`}>
          {banner.kind === "goal" && (
            <>
              <div className="goal-text">GOAL!</div>
              <h2 style={{ marginTop: 8 }}>Welcome, {banner.name}</h2>
              {banner.mismatch && <span className="mismatch-flag">Away fan · home branch differs</span>}
            </>
          )}
          {banner.kind === "dupe" && (
            <>
              <h2 style={{ color: "var(--amber)" }}>Already checked in</h2>
              <p className="muted">{banner.name} · at {banner.time}</p>
            </>
          )}
          {banner.kind === "bad" && (
            <>
              <h2 style={{ color: "var(--danger)" }}>Rejected</h2>
              <p className="muted">{banner.text}</p>
            </>
          )}
        </div>
      )}

      <section className="card stack" style={{ marginTop: 18 }}>
        <p className="label">Manual fallback</p>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
          If the camera won&apos;t scan, paste or type the ticket token.
        </p>
        <div className="row">
          <input type="text" placeholder="ticket token" value={manual}
            onChange={(e) => setManual(e.target.value)} />
          <button className="btn" style={{ flex: "0 0 auto", width: "auto", padding: "12px 18px" }}
            onClick={() => { if (manual.trim()) { lockRef.current = false; resolve(manual.trim()); } }}>
            Check in
          </button>
        </div>
      </section>
    </main>
  );
}

export default function ScanPage() {
  return (
    <StaffGate>
      <Scanner />
    </StaffGate>
  );
}

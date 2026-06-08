"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, fanNumber, VENUE, type TicketResult } from "@/lib/supabase";
import { confetti, crowdRoar, setMuted } from "@/lib/celebrate";

type Ticket = { name: string; emp_no: string | null; city: string; token: string };

export default function EmployeePage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [opened, setOpened] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [flash, setFlash] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Deep link: ?t=<token> reopens an existing ticket (shareable / savable).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (!t) return;
    api.getTicket(t).then((r: TicketResult) => {
      if (r.status === "ok") {
        setTicket(r);
        setOpened(true);
      } else if (r.status === "revoked") {
        setError("This ticket has been revoked. Please contact the organisers.");
      }
    }).catch(() => setError("Could not load that ticket."));
  }, []);

  // Render QR whenever the opened ticket changes.
  useEffect(() => {
    if (opened && ticket && qrRef.current) {
      QRCode.toCanvas(qrRef.current, ticket.token, {
        width: 184, margin: 1,
        color: { dark: "#07100d", light: "#ffffff" },
      });
    }
  }, [opened, ticket]);

  const register = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api.rsvpRegister(email.trim());
      if (r.status === "not_found") {
        setError("That email isn't on the participant list. Use your ATIB work email, or contact the organisers.");
      } else {
        setTicket({ name: r.name, emp_no: r.emp_no, city: r.city, token: r.token });
        // Reflect the token in the URL so the page is savable / shareable.
        window.history.replaceState(null, "", `?t=${encodeURIComponent(r.token)}`);
      }
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [email]);

  const openPack = useCallback(() => {
    if (opened) return;
    setShaking(true);
    setTimeout(() => {
      setFlash(true);
      confetti();
      if (!muted) crowdRoar();
      setTimeout(() => {
        setOpened(true);
        setShaking(false);
        setFlash(false);
      }, 360);
    }, 420);
  }, [opened, muted]);

  const toggleMute = () => {
    const v = !muted;
    setMutedState(v);
    setMuted(v);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="app">
      <div className={`flash ${flash ? "on" : ""}`} />
      <header className="brand">
        <span className="dot" />
        <span className="name">ATIB Fan Zone</span>
        <span className="spacer" />
        {ticket && (
          <button onClick={toggleMute} className="label" style={{ background: "none", border: "none", cursor: "pointer" }}>
            {muted ? "🔇 Sound off" : "🔊 Sound on"}
          </button>
        )}
      </header>

      {!ticket && (
        <section className="card stack">
          <h1 style={{ fontSize: "2.1rem" }}>Reserve your ticket</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            World Cup 2026 · eight match nights across Tripoli, Benghazi & Misrata. Enter your ATIB work email to get your fan card.
          </p>
          <form onSubmit={register} className="stack">
            <input
              type="email"
              required
              placeholder="you@atib.ly"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button className="btn" disabled={busy}>
              {busy ? "Checking…" : "Get my ticket"}
            </button>
          </form>
          {error && <p className="msg error">{error}</p>}
          <p className="label" style={{ marginTop: 6 }}>
            Nights: 11 · 13 · 15 · 16 · 19 · 21 · 26 · 28 June · from 20:00
          </p>
        </section>
      )}

      {ticket && !opened && (
        <section className="card center stack">
          <h2 style={{ fontSize: "1.5rem" }}>Your pack is ready, {ticket.name.split(" ")[0]}!</h2>
          <div
            className={`pack ${shaking ? "shaking" : ""}`}
            onClick={openPack}
            role="button"
            aria-label="Tap to open your ticket"
          >
            <span className="sheen" />
            <span className="hint label center" style={{ display: "block" }}>Tap to open</span>
          </div>
          <button className="btn ghost" onClick={() => setOpened(true)}>
            Skip animation
          </button>
        </section>
      )}

      {ticket && opened && (
        <section className="stack">
          <div className="ticket">
            <div className="ticket-inner">
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div>
                  <p className="label">Supporter</p>
                  <h2 style={{ fontSize: "1.7rem" }}>{ticket.name}</h2>
                </div>
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <p className="label">Fan №</p>
                  <div className="fan">#{fanNumber(ticket.name)}</div>
                </div>
              </div>
              <p className="label" style={{ marginTop: 12 }}>Home venue</p>
              <p style={{ margin: "2px 0 0" }}>
                {ticket.city} · {VENUE[ticket.city] ?? "Fan Zone"}
              </p>
              <div className="qr-box">
                <canvas ref={qrRef} />
              </div>
              <p className="label center" style={{ marginTop: 10 }}>
                Valid all 8 nights · show this at the door
              </p>
            </div>
          </div>
          <button className="btn" onClick={copyLink}>
            {copied ? "Link copied ✓" : "Copy / save my ticket link"}
          </button>
          <p className="muted center" style={{ fontSize: "0.85rem" }}>
            Bookmark this page — reopening the link brings your ticket straight back.
          </p>
        </section>
      )}

      <div className="spacer" />
      <p className="label center" style={{ marginTop: 24, opacity: 0.6 }}>
        ATIB · internal event · employees only
      </p>
    </main>
  );
}

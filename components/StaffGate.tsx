"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Wraps staff-only pages (scanner, dashboard) with a Supabase Auth sign-in.
// The functions themselves re-verify staff membership server-side, so this is
// a UX gate, not the security boundary.
export default function StaffGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };

  if (!ready) {
    return <main className="app center"><p className="muted">Loading…</p></main>;
  }

  if (!signedIn) {
    return (
      <main className="app">
        <header className="brand">
          <span className="dot" />
          <span className="name">ATIB Fan Zone · Staff</span>
        </header>
        <section className="card stack">
          <h1 style={{ fontSize: "1.8rem" }}>Staff sign-in</h1>
          <p className="muted" style={{ marginTop: 2 }}>Door &amp; organiser access only.</p>
          <form onSubmit={signIn} className="stack">
            <input type="email" placeholder="staff email" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            <input type="password" placeholder="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          {error && <p className="msg error">{error}</p>}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function SignOutButton() {
  return (
    <button
      className="label"
      style={{ background: "none", border: "none", cursor: "pointer" }}
      onClick={() => supabase.auth.signOut()}
    >
      Sign out
    </button>
  );
}

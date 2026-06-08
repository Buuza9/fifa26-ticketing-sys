// Runtime-synthesized sound + confetti — no audio/image assets to host.
// Respects reduced-motion and only plays after a user gesture (autoplay rules).

let muted = false;
export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// A short crowd swell (filtered noise) + a stadium horn (two square tones).
export function crowdRoar() {
  if (muted || typeof window === "undefined") return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const now = ctx.currentTime;

  // Crowd: white noise through a sweeping band-pass, swelling then fading.
  const dur = 1.4;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(500, now);
  bp.frequency.linearRampToValueAtTime(1600, now + 0.5);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.exponentialRampToValueAtTime(0.32, now + 0.35);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(bp).connect(ng).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);

  // Horn: two stacked square tones.
  [220, 277].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.connect(g).connect(ctx.destination);
    o.start(now + 0.05);
    o.stop(now + 0.75);
  });

  setTimeout(() => ctx.close(), (dur + 0.2) * 1000);
}

// Lightweight DOM confetti burst — no library.
export function confetti() {
  if (prefersReducedMotion() || typeof document === "undefined") return;
  const colors = ["#1db954", "#f4c14b", "#eafff4", "#36d1dc"];
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden";
  document.body.appendChild(root);
  for (let i = 0; i < 80; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 8;
    const left = Math.random() * 100;
    const delay = Math.random() * 0.2;
    const dur = 0.9 + Math.random() * 0.8;
    p.style.cssText = `position:absolute;top:-20px;left:${left}vw;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:2px;opacity:0.95;transform:rotate(${Math.random() * 360}deg);animation:fall ${dur}s ${delay}s ease-in forwards`;
    root.appendChild(p);
  }
  const style = document.createElement("style");
  style.textContent =
    "@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}";
  root.appendChild(style);
  setTimeout(() => root.remove(), 2200);
}

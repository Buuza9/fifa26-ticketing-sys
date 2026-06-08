# Design system

## 1. Concept
The system should feel like a football moment, not a form. Two interactions carry the personality, and everything else stays calm and dark so they pop:
- **Opening your ticket** is a sticker‑pack / player‑card reveal.
- **Getting scanned at the door** is a goal celebration.

## 2. Visual tokens
| Token | Value | Use |
|---|---|---|
| Background | `#07100d` (deep pitch black‑green) | app background, with soft radial green glows |
| Pitch green | `#1db954` → `#0e7a3e` | primary actions, success, accents |
| Gold | `#f4c14b` | highlights, the "fan number", celebratory accents |
| Text | `#eafff4` | primary text |
| Muted | `#7fa093` | secondary text |
| Line | `#1d362c` | borders, dividers |
| Danger | `#ff6a6a` | errors, rejected scans |

Subtle full‑bleed vertical "pitch lines" texture sits behind everything at very low opacity.

## 3. Typography
- **Display:** *Anton* — condensed, sporty, used for names, "GOAL!", big numbers.
- **Body / UI:** *Archivo* (and *Archivo Narrow* for labels/buttons, uppercase with wide tracking).
- Deliberately not the generic defaults; the pairing reads as stadium signage.

## 4. Signature moments

**Pack reveal (employee ticket)** — a foil pack bobs with a sheen sweep; on tap it shakes, the lid peels, a flash + confetti fire, and the holographic supporter card flips into view (animated rainbow‑foil border) showing name, a personal "FAN ###" number derived from the name, home city/venue, and the QR.

**GOAL check‑in (scanner)** — on a valid scan: the ball rockets into a net, the net ripples, "GOAL!" slams in with overshoot, a short synthesized crowd roar + horn plays, "Welcome, <name>" fades up, and the tonight counter ticks. Duplicate scans show a calm amber "already checked in"; invalid scans show a red reject. (Reference implementation: `atib-worldcup-experience.html`.)

## 5. Screen inventory
| Screen | Key elements |
|---|---|
| RSVP (`index.html`) | email field, CTA, error/empty states, event summary |
| Ticket (`index.html`) | pack → holographic card with QR, save hint, copy‑link |
| Scanner (`scan.html`) | sign‑in, city + night selector, camera viewport, big result banner, manual fallback entry |
| Dashboard (`dashboard.html`) | stat tiles (issued / check‑ins / unique / reach), night × city matrix, ticket admin |

## 6. Sound
All audio is synthesized at runtime with the Web Audio API (a noise‑swell crowd and a short horn) — no audio files to host. A mute control is always available; sound only plays after a user gesture (the scan), respecting autoplay rules.

## 7. Accessibility & localisation
- Maintain strong contrast (the palette is built for it); ensure tap targets are comfortably large for door use.
- Provide a non‑animated, non‑audio path everywhere (the duplicate/invalid states are already calm; honour reduced‑motion preferences).
- **Arabic / RTL** is a strong candidate given the audience — plan strings for translation and an RTL layout switch if confirmed (see REQUIREMENTS open questions).

## 8. Branding & IP
Use generic football motifs only — ball, net, pitch, stickers/cards, flags. Do **not** use official FIFA logos, the World Cup trophy, or the 2026 marks, to keep an internal corporate event trademark‑safe.

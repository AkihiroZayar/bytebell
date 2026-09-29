<p align="center">
  <img src="app-icon.png" alt="ByteBell logo" width="112">
</p>

<h1 align="center">ByteBell</h1>

<p align="center">
  Your weekly timetable with smart reminders — an installable web app (PWA) for iPhone and Android.<br>English · 日本語 · မြန်မာ — by AkihiroLabs.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-1E3A8A" alt="version 1.1.0">
  <img src="https://img.shields.io/badge/PWA-installable-00A8CC" alt="PWA">
  <img src="https://img.shields.io/badge/vanilla-JavaScript-1E3A8A" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/lang-EN%20%7C%20JA%20%7C%20MY-00A8CC" alt="EN | JA | MY">
</p>

---

## ✨ Features

- **Weekly timetable** — add blocks (class, shift, gym…) with days, times, place and colour
- **Today & Week views** — see what's next today or the whole week at a glance
- **Smart reminders** — Web Push notifications before each block, even when the app is closed
- **Presets** — save common blocks and add them in one tap
- **Overnight blocks** — times that cross midnight are handled correctly
- **Optional cloud sync** — sign in to sync across devices (Supabase); works fully local-only without it
- **Installable** — add to your home screen on iPhone or Android; works offline
- **Trilingual** — English, Japanese and Burmese

## 🚀 Getting started

ByteBell uses JavaScript modules and a service worker, so it must be served over HTTP (not opened as a file).

1. Clone this repository.
2. Serve the folder, e.g. with VS Code **Live Server**, or `npx serve .`
3. Open it in your browser — or just use the live version below.

Live: **https://akihirozayar.github.io/bytebell/**

### Optional: cloud sync & push

1. Create a Supabase project and run `schema.sql` in **SQL Editor**.
2. Put your project URL and **anon** key in `config.js` (never the service_role key).
3. Generate VAPID keys (`npx web-push generate-vapid-keys`) and put the public key in `config.js`.

Leave `config.js` empty and ByteBell simply runs local-only, with no login.

## 📁 Project structure

```
bytebell/
├── index.html          # App shell
├── style.css           # Styles
├── app.js              # Entry point
├── render.js           # Today / Week / chrome rendering
├── sheet.js            # Add / edit block sheet, presets
├── calendar.js         # Week calendar
├── time.js             # Time helpers (incl. overnight blocks)
├── storage.js          # Local storage + validation
├── i18n.js             # EN / JA / MY strings
├── auth.js · cloud.js  # Optional Supabase login + sync
├── push.js             # Web Push subscription
├── demo.js             # Sample timetable
├── config.js           # Supabase + VAPID public settings
├── sw.js               # Service worker (offline + push)
├── manifest.json       # PWA manifest
├── schema.sql          # Supabase tables + row-level security
├── app-icon.png        # App logo (README, 512px)
├── favicon.png · apple-touch-icon.png · icon-192.png · icon-512.png
├── icon.png · logo.png · wordmark*.png  # Byte 🦝 + AkihiroLabs brand art
├── CHANGELOG.md
└── README.md
```

> ℹ️ Files stay in the repo root on purpose: the service worker caches them by path, so moving them would break installed copies.

## 🛠 Tech

- Vanilla JavaScript (ES modules), HTML and CSS — no frameworks, no build tools
- Service Worker + Web Push for offline use and reminders
- [Supabase](https://supabase.com/) (optional) for login and sync, secured with row-level security

## 🔖 Versioning

This project uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

- The version is tracked in [`CHANGELOG.md`](CHANGELOG.md) and GitHub Releases. When you change cached files, also bump `CACHE` in `sw.js` (e.g. `bytebell-v2`) so installed apps update.
- To release: bump the version, add an entry to [`CHANGELOG.md`](CHANGELOG.md), then create a GitHub Release tagged `vX.Y.Z`.

Current version: **v1.1.0** — see the [changelog](CHANGELOG.md).

## 💬 Community

Updates and feedback on the **AkihiroLabs Discord server**.

---

<p align="center">
  Built with 🦝 by <b>AkihiroLabs</b>
</p>

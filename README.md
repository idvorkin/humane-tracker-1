# Humane Tracker

**[Try It Yourself →](https://humane-tracker.surge.sh)**

Track your habits and behaviors with a local-first approach.

![Humane Tracker Screenshot](https://raw.githubusercontent.com/idvorkin/ipaste/main/20251129_151820.webp)

Your data stays on your device, with optional cloud sync when you need it.

## Features

### Local-First Storage

Your habits and data are stored directly in your browser using IndexedDB. No account required to get started—just open and track.

### Cloud Sync (Optional)

Want to sync across devices? Enable Dexie Cloud to keep your habits in sync everywhere while maintaining privacy.

### Works Offline

Install it like an app on your phone or desktop—then use it anywhere, even without internet.

**On iPhone/iPad:** Tap the Share button → "Add to Home Screen"

**On Android:** Tap the menu (⋮) → "Install app" or "Add to Home Screen"

**On Desktop (Chrome/Edge):** Click the install icon in the address bar, or Menu → "Install Humane Tracker"

## Why You'll Love It

- **No setup required** - Just open the page and start tracking. No apps to install, no accounts to create
- **Private by design** - Data stays on your device by default. Nothing is uploaded anywhere unless you enable sync
- **Works anywhere** - Use it offline once installed as a PWA
- **Sync when you want** - Optional cloud sync keeps devices in harmony

## Getting Started

1. Go to [humane-tracker.surge.sh](https://humane-tracker.surge.sh)
2. Start adding your habits
3. Track daily!

---

## For Developers

<details>
<summary>Architecture & Development</summary>

### Tech Stack

React 18 + TypeScript + Vite + Dexie (IndexedDB)

### Local Development

```bash
cd humane-tracker
npm install
just dev
# Open http://localhost:3000
```

### Commands

```bash
just dev      # Run development server
just build    # Build for production
just test     # Run unit tests (Vitest)
just e2e      # Run E2E tests (Playwright)
just deploy   # Test, build, and deploy to surge.sh
```

### Code Quality

- **Biome** for formatting and linting (runs via pre-commit hook)
- **Vitest** for unit tests
- **Playwright** for E2E tests

</details>

# Humane Tracker

A habit tracking application with local-first storage and optional cloud sync for tracking wellness goals across different categories.

**Live App:** https://humane-tracker.surge.sh
**GitHub:** https://github.com/idvorkin/humane-tracker-1

## Features

- Track habits across 5 categories: Movement & Mobility, Connections, Inner Balance, Joy & Play, Strength Building
- Weekly view with daily tracking
- Visual status indicators (due today, overdue, met target, etc.)
- Collapsible sections for better organization
- Local-first with Dexie (IndexedDB) - works offline
- Optional cloud sync with Dexie Cloud
- Click cells to mark habits as complete, partial, or add counts

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

### Optional: Enable Cloud Sync

To enable cloud synchronization across devices:

1. Create a Dexie Cloud database at https://dexie.org
2. Copy `.env.example` to `.env`
3. Set `VITE_DEXIE_CLOUD_URL` to your Dexie Cloud URL
4. Whitelist your deployment domains (see below)

### Dexie Cloud Domain Whitelisting

Dexie Cloud requires whitelisting origins that can access your database. Use the CLI:

```bash
# Connect to your database (creates dexie-cloud.json and dexie-cloud.key)
npx dexie-cloud connect <your-database-url>

# Whitelist a domain
npx dexie-cloud whitelist https://humane-tracker.surge.sh
npx dexie-cloud whitelist https://humane-tracker-stage.surge.sh

# For local development (requires --force for non-https)
npx dexie-cloud whitelist http://localhost:3000 --force

# Remove a domain
npx dexie-cloud whitelist https://old-domain.com --delete

# List all CLI commands
npx dexie-cloud --help
```

## Data Structure

The app uses Dexie (IndexedDB) with two tables:

### `habits` table

```javascript
{
  id: string,
  name: string,
  category: 'mobility' | 'connection' | 'balance' | 'joy' | 'strength',
  targetPerWeek: number,
  userId: string,
  createdAt: Date
}
```

### `entries` table

```javascript
{
  id: string,
  habitId: string,
  userId: string,
  date: Date,
  value: number, // 1 for complete, 0.5 for partial, or actual count
  createdAt: Date
}
```

## Usage

- **Add Habit:** Click the "+ Add Habit" button to create a new habit
- **Track Progress:** Click on any day cell to mark it complete (✓), partial (½), or clear it
- **View Sections:** Click section headers to expand/collapse categories
- **Status Indicators:**
  - ● = done today
  - ✓ = weekly target met
  - ⏰ = due today
  - → = due tomorrow
  - ! = overdue
  - ½ = partial completion

## Development

Use the justfile for all commands:

```bash
just dev          # Run development server
just build        # Build for production
just test         # Run unit tests
just e2e          # Run E2E tests (Playwright)
just deploy-stage # Deploy to staging (humane-tracker-stage.surge.sh)
just deploy-prod  # Deploy to production (humane-tracker.surge.sh)
```

## Deployment

The app is deployed to **Surge**:

- **Production:** https://humane-tracker.surge.sh
- **Staging:** https://humane-tracker-stage.surge.sh

To deploy:

```bash
just deploy-stage  # Deploy to staging first
just deploy-prod   # Deploy to production after testing
```

Both commands run tests, build the app, and deploy to Surge.

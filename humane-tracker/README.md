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

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

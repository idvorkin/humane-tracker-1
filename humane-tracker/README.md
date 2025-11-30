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

## Debugging Dexie Cloud Sync

The application includes comprehensive logging for debugging sync issues. When Dexie Cloud is configured, you'll see detailed console logs:

### Enabling Debug Logging

Debug logging is automatically enabled in development mode (`import.meta.env.DEV`). This enables:

- **Dexie.debug mode**: Enhanced error stack traces
- **Sync state monitoring**: Real-time sync phase and status updates
- **WebSocket monitoring**: Connection status tracking
- **Sync events**: Detailed logging of push/pull operations

### Console Log Examples

```
[Dexie] Debug mode enabled - enhanced error stack traces
[Dexie Cloud] Configuring sync with URL: https://your-db.dexie.cloud
[Dexie Cloud] 2025-11-30T12:00:00.000Z Sync state: { phase: 'initial', status: 'not-started', ... }
[Dexie Cloud] 2025-11-30T12:00:01.000Z WebSocket status: connecting
[Dexie Cloud] 2025-11-30T12:00:02.000Z ✓ WebSocket connected - live sync active
[Dexie Cloud] 2025-11-30T12:00:03.000Z ↑ Uploading changes (50%)
[Dexie Cloud] 2025-11-30T12:00:04.000Z ✓ Sync complete
[Dexie Cloud] 2025-11-30T12:00:05.000Z 🎉 Sync completed successfully
[Dexie Cloud] Last successful sync: 11/30/2025, 12:00:05 PM (0s ago)
```

### Common Sync Issues and Solutions

**WebSocket Connection Issues:**

```
[Dexie Cloud] ✗ WebSocket error - check domain whitelist in Dexie Cloud
```

**Solution**: Ensure your domain is whitelisted using `npx dexie-cloud whitelist <domain>`

**Sync Stuck in "connecting" or "offline":**

```
[Dexie Cloud] ⚠ WebSocket disconnected - using HTTP polling
```

**Solution**: Check network connectivity and verify the Dexie Cloud URL is correct

**License Errors:**

```
[Dexie Cloud] Sync state: { ..., license: 'expired' }
```

**Solution**: Check your Dexie Cloud subscription status

### Monitoring Tools

The app also provides a **Sync Status Dialog** (accessible from settings) that shows:

- Current sync phase and status
- Last successful sync timestamp
- WebSocket connection state
- License status
- Progress indicators for active syncs
- Detailed error messages when sync fails

### Additional Resources

- [Dexie Cloud Sync State Documentation](https://dexie.org/cloud/docs/db.cloud.syncState)
- [Dexie Cloud Best Practices](https://dexie.org/cloud/docs/best-practices)
- [Dexie.debug Documentation](https://dexie.org/docs/Dexie/Dexie.debug)

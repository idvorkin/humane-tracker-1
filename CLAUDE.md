# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Address your human partner as "Igor" at all times.

## Relationship Rules

- We're colleagues working together - no formal hierarchy
- Speak up immediately when you don't know something
- Call out bad ideas, unreasonable expectations, and mistakes - Igor depends on this
- Never be agreeable just to be nice - give honest technical judgment
- Stop and ask for clarification rather than making assumptions
- When you disagree with an approach, push back with specific technical reasons

## Build & Development Commands

**Always use the justfile for commands.** Run from `humane-tracker/` directory:

```bash
just setup        # One-time setup after clone (git hooks, npm install)
just dev          # Run development server - opens http://localhost:3000
just build        # Build for production (tsc + vite build)
just test         # Run unit tests (Vitest)
just e2e          # Run E2E tests (all projects - desktop + mobile)
just e2e-fast     # Run fast E2E tests (smoke tests)
just e2e-desktop  # Run E2E tests (desktop chromium only)
just e2e-mobile   # Run E2E tests (mobile only)
just e2e-headed   # Run E2E tests with visible browser
just e2e-debug    # Run E2E tests in debug mode (step-through)
just e2e-report   # View Playwright HTML report (http://localhost:9323)
just e2e-ui       # Run E2E tests in interactive UI mode
just deploy-stage # Deploy to staging (humane-tracker-stage.surge.sh)
just deploy-prod  # Deploy to production (humane-tracker.surge.sh)
```

### Accessing Services in Containers

When running in a container with Tailscale:

- Servers won't be on `localhost` - use the container's Tailscale hostname/IP instead
- Find your container info: `tailscale status` (look for current machine)
- Access dev server: `https://<container-hostname>:3000` (e.g., `https://c-5003:3000`)
- Access E2E report: `http://<container-hostname>:9323` (e.g., `http://c-5003:9323`)
- Dev server uses HTTPS (self-signed cert) - accept certificate warnings

This allows viewing the dev server or test reports from any device on your Tailscale network (like your laptop while the container runs on a remote machine).

## Code Quality

- **Biome** for formatting (tabs, double quotes) and linting - runs via pre-commit hook
- **TypeScript** type checking - runs via pre-commit hook
- **Vitest** for unit tests (jsdom environment)
- **Playwright** for E2E tests (in `tests/` directory)

Pre-commit runs Biome checks, TypeScript type checking, and unit tests automatically.

## Multi-Agent Setup

This repo supports multiple AI agents working in parallel via full clones.

### Git Remotes

- `origin` = **idvorkin-ai-tools** fork (agents push here, can merge to main directly)
- `upstream` = **idvorkin** (human-only repo, requires PR approval to merge)

### Workflow

1. **Agents work on feature branches** - Create branches like `feature/my-change`
2. **Push to origin** - `git push -u origin feature/my-change`
3. **Create PRs to origin/main** - Agents can merge these directly
4. **PRs to upstream require human approval** - Use `gh pr create --repo idvorkin/humane-tracker-1`

### Git Hooks

Located in `.githooks/` (activated via `just setup` or `git config core.hooksPath .githooks`):

- **pre-commit** - Syncs beads, runs biome/prettier/TypeScript checks, runs unit tests
- **pre-push** - Blocks direct pushes to main (forces PR workflow)
- **post-merge** - Auto-syncs beads after pulls

### Rules

- **✅ ORIGIN MERGES**: Agents can merge directly to origin/main (agent working repo)
- **⚠️ UPSTREAM MERGES**: Only humans merge to upstream/main. Agents must create PRs.
- **🚫 NO --no-verify**: Never use `--no-verify` to bypass hooks

## Beads Integration

We use **beads** (`bd`) for issue tracking. Issues are synced via git on the `beads-metadata` branch.

### Quick Reference

```bash
bd list                    # List all issues
bd ready                   # Show issues ready to work on (no blockers)
bd create "Fix bug"        # Create a new issue
bd show HT-1               # Show issue details
bd update HT-1 --status in_progress  # Claim an issue
bd close HT-1              # Complete an issue
bd sync                    # Sync issues with git
```

### Workflow

1. **Start session**: Check `bd ready` for unblocked work
2. **Claim work**: `bd update HT-N --status in_progress`
3. **Discover related work**: Create new issues with `discovered-from` dependency
4. **Complete work**: `bd close HT-N --reason "Fixed in PR #X"`

### Discovered-from Dependencies

When you discover related work while implementing an issue, create a new issue linked to the original:

```bash
bd create "Related fix" --dep HT-1:discovered-from
```

This maintains an audit trail of how issues were discovered.

## Architecture

React 18 + TypeScript + Vite application for tracking habits and behaviors with local-first storage.

### Core Components

- **App.tsx** - Main application component with routing and state management
- **HabitCard** - Individual habit display and interaction
- **HabitForm** - Form for creating/editing habits

### Data Layer

- **Dexie** - IndexedDB wrapper for local-first storage
- **dexie-cloud-addon** - Optional cloud sync capability
- **Repository Pattern** - All DB access goes through repositories

### Repository Pattern (IMPORTANT)

**NEVER access `db.entries` or `db.habits` directly.** Always use the repository layer:

```typescript
// ❌ WRONG - direct DB access
const entries = await db.entries.where("userId").equals(userId).toArray();

// ✅ CORRECT - use repository
const entries = await entryRepository.getByUserId(userId);
```

**Why?** Dates are stored as ISO strings in IndexedDB but used as `Date` objects in app code. The repositories handle this conversion automatically:

- `entryRepository` - CRUD for habit entries (`src/repositories/entryRepository.ts`)
- `habitRepository` - CRUD for habits (`src/repositories/habitRepository.ts`)

The only place that should import `db` directly is the repositories themselves.

**Exception**: E2E tests may access `db` directly via `page.evaluate()` for test setup and assertions. This is acceptable because tests need to verify the database state.

### Key Files

- `src/config/db.ts` - Database schema and Dexie configuration
- `src/repositories/` - Repository layer for DB access with date conversion
- `src/services/habitService.ts` - Business logic (uses repositories)
- `src/App.tsx` - Main application logic
- `src/App.test.tsx` - Unit tests

## Development Conventions

### Clean Code Principles

- Keep code DRY (Don't Repeat Yourself)
- Avoid nesting scopes, minimize telescoping
- Return early from functions when possible
- Use `const` whenever possible
- Use TypeScript types

### Date Handling (IMPORTANT)

This codebase has had repeated date-related bugs. Follow these rules strictly:

**Always use the standard helpers from `src/repositories/types.ts`:**

```typescript
import { toDateString, fromDateString, normalizeDate } from "../repositories/types";

// ✅ CORRECT - use toDateString for date-only comparison
const dateStr = toDateString(date);  // Returns "YYYY-MM-DD"

// ❌ WRONG - custom date formatting (inconsistent, error-prone)
const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;  // Missing padding, month off by 1
```

**Why this matters:**
- `toDateString()` pads months/days with zeros (`"2024-01-05"` not `"2024-1-5"`)
- `toDateString()` uses correct month values (JavaScript months are 0-indexed)
- Custom formats cause subtle bugs when comparing dates across the codebase

**Date comparison patterns:**
```typescript
// Compare dates by converting to standard strings
if (toDateString(date1) === toDateString(date2)) { ... }

// Handle mixed Date/string from IndexedDB
const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
const dateStr = toDateString(d);
```

**Never create custom date formatting functions** - always use the repository helpers.

### Clean Commits

- Run `git status` before committing to review staged files
- Keep distinct changes in distinct commits
- Avoid mixing linting/formatting changes with feature changes
- Run pre-commit hooks before committing

### Component Architecture

Follow the `useHabitTrackerVM` + `HabitTracker` pattern:

- **Extract logic to hooks**: Business logic goes in custom hooks (e.g., `useXxxVM.ts`)
- **Keep components humble**: Components should primarily render; call hook methods for actions
- **Export pure functions**: Extract testable pure functions from hooks for direct unit testing
- **Hooks handle**: State coordination, side effects, data fetching, business rules
- **Components handle**: UI rendering, calling hook methods on events

### Writing Code

- Make the smallest reasonable changes to achieve the desired outcome
- Prefer simple, clean, maintainable solutions over clever ones
- Work to reduce code duplication
- Match the style and formatting of surrounding code

### Testing

- Follow TDD: write failing test -> make it pass -> refactor
- Tests must comprehensively cover functionality
- Never delete a failing test - fix the code or discuss
- Test output must be clean - capture and validate expected errors

### E2E Testing

- **Real IndexedDB**: E2E tests use real browser IndexedDB, not mocks
- **Smart Waiting**: Use IndexedDB helpers from `tests/helpers/indexeddb-helpers.ts` - they poll for actual state changes instead of arbitrary timeouts
- **Test Isolation**: Each Playwright worker has its own isolated browser context with separate IndexedDB
- **E2E Mode**: Tests use `?e2e=true` URL parameter - bypasses auth but uses real IndexedDB
- **Artifact Capture**: Playwright automatically captures videos, screenshots, and traces during test execution
- **Multi-Device**: Tests run on both desktop (chromium) and mobile (iPhone 14 Pro) projects

Key helper functions:

- `waitForEntryCount(page, count)` - Wait for specific number of entries in DB
- `getDBEntryCount(page)` - Get current entry count
- `clearIndexedDB(page)` - Clean up after tests (use in `afterEach`)

**NEVER use arbitrary timeouts** - always wait for actual IndexedDB state changes.

### Viewing E2E Test Results

Playwright provides a comprehensive HTML report with videos, screenshots, and traces:

1. **Start report server**: `just e2e-report` (in a separate terminal) - runs on port 9323
   - Leave this running continuously - it updates automatically as tests complete
   - Access report:
     - Local: `http://localhost:9323`
     - Container with Tailscale: `http://<container-hostname>:9323` (e.g., `http://c-5003:9323`)

2. **Run tests**: `just e2e` (runs both desktop and mobile)
   - Or `just e2e-desktop` for desktop only
   - Or `just e2e-mobile` for mobile only

3. **View results**: Refresh browser to see latest test results

The report includes:

- Test results with pass/fail status
- Screenshots captured automatically on failure (or always in development)
- Video recordings of test execution
- Trace files for step-by-step debugging
- Filter by project (desktop/mobile), status, or test name

**Viewing Trace Files:**

Trace viewer requires HTTPS or localhost (service worker requirement). Two options:

1. **Recommended**: Use Playwright's online trace viewer
   - Download the `.zip` trace file from the report
   - Go to https://trace.playwright.dev/
   - Drag and drop the `.zip` file (loads entirely in browser, no data sent)

2. **SSH Tunnel** (if you need direct access):
   ```bash
   ssh -L 9323:localhost:9323 developer@<container-hostname>
   ```
   Then access `http://localhost:9323` in your browser

**Best practice**: Start the report server once and leave it running throughout your development session.

**Interactive debugging**: Use `just e2e-ui` to run tests in Playwright's UI mode for step-through debugging.

### Debugging

1. Read error messages carefully
2. Reproduce consistently before investigating
3. Check recent changes (git diff)
4. Find working examples to compare against
5. Form a single hypothesis and test minimally

**Important notes:**

- E2E tests run on both chromium (desktop) and mobile (iPhone 14 Pro) - use `just e2e-desktop` or `just e2e-mobile` to run specific projects
- If in a container, NEVER direct commit to main, always create a PR

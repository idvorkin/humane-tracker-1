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
just dev          # Run development server - opens http://localhost:3000
just build        # Build for production (tsc + vite build)
just test         # Run unit tests (Vitest)
just e2e          # Run E2E tests (Cypress - chromium only)
just e2e-open     # Run E2E tests in interactive mode (Cypress UI)
just screenshots  # View E2E test screenshots in browser (http://localhost:8080)
just deploy       # Run tests, build, and deploy to Surge
```

### Accessing Services in Containers

When running in a container with Tailscale:

- Servers won't be on `localhost` - use the container's Tailscale hostname/IP instead
- Find your container info: `tailscale status` (look for current machine)
- Access dev server: `http://<container-hostname>:3000` (e.g., `http://c-5003:3000`)
- Access screenshots: `http://<container-hostname>:8080` (e.g., `http://c-5003:8080`)
- Or use Tailscale IP directly: `http://100.82.166.109:8080`

This allows viewing the dev server or screenshots from any device on your Tailscale network (like your laptop while the container runs on a remote machine).

## Code Quality

- **Biome** for formatting (tabs, double quotes) and linting - runs via pre-commit hook
- **Vitest** for unit tests (jsdom environment)
- **Cypress** for E2E tests (in `cypress/e2e/` directory)

Pre-commit runs Biome checks and unit tests automatically.

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

**Exception**: E2E tests may access `db` directly via `cy.window().then()` for test setup and assertions. This is acceptable because tests need to verify the database state.

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
- **Smart Waiting**: Use Cypress custom commands for IndexedDB - they poll for actual state changes instead of arbitrary timeouts
- **Test Isolation**: Each Cypress test has its own isolated browser context with separate IndexedDB
- **E2E Mode**: Tests use `?e2e=true` URL parameter - bypasses auth but uses real IndexedDB
- **Screenshots**: E2E tests can generate screenshots in `test-results/screenshots/` - view with `just screenshots`

Key custom commands:

- `cy.visitE2E()` - Navigate to app in E2E mode
- `cy.loadDefaultHabits(habits)` - Load habits into IndexedDB
- `cy.waitForEntryCount(count)` - Wait for specific number of entries in DB
- `cy.getDBEntryCount()` - Get current entry count
- `cy.clearIndexedDB()` - Clean up after tests (use in `afterEach`)
- `cy.expandAllSections()` - Expand all habit sections

**NEVER use arbitrary timeouts** - always wait for actual IndexedDB state changes.

### Viewing E2E Screenshots

E2E tests automatically capture screenshots at key moments. To view them:

1. **Generate screenshots**: Run `just e2e` - creates `test-results/screenshots/`
2. **Start viewer**: Run `just screenshots` - starts HTTP server on port 8080
3. **Open browser**:
   - Local: `http://localhost:8080`
   - Container with Tailscale: `http://<container-hostname>:8080` (e.g., `http://c-5003:8080`)

The viewer provides:

- Gallery view of all screenshots
- Filter by desktop/mobile
- Click to zoom, keyboard navigation (arrows, ESC)
- Metadata with timestamps

Screenshots are documented in `test-results/screenshots/screenshots.json` with device info and timestamps.

### Debugging

1. Read error messages carefully
2. Reproduce consistently before investigating
3. Check recent changes (git diff)
4. Find working examples to compare against
5. Form a single hypothesis and test minimally

- only run tests on chromium
- If in a container, NEVER direct commit to main, always create A PR

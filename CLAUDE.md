# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Address your human partner as "Igor" at all times.

## Convention Updates

**Last reviewed:** 2025-12-14 (chop-conventions)

Projects using [chop-conventions](https://github.com/idvorkin/chop-conventions) should periodically:

1. **Pull updates** - Check chop-conventions for new conventions or improvements
2. **Push improvements** - If you've developed useful patterns locally, submit a PR to chop-conventions
3. **Update this date** - After reviewing, update the "Last reviewed" date above

**Before reviewing external repos**: Always `git fetch upstream && git reset --hard upstream/main` first.

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

### Opening Files in Neovim

Open files for Igor's review in a tmux split (keeps Claude's terminal available):

```bash
# Open file(s) in 2/3 width split on right
tmux split-window -h -l 66% "nvim /path/to/file"

# Open multiple files
tmux split-window -h -l 66% "nvim file1.ts file2.ts file3.ts"

# Open at specific line number
tmux split-window -h -l 66% "nvim +42 /path/to/file"

# Open git diff in nvim
tmux split-window -h -l 66% "nvim -c 'Git diff'"
```

Use this when:
- Showing changed files, diffs, or architecture docs for review
- Igor wants to edit while Claude continues working
- Comparing files side-by-side with the terminal

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

### Workflow: Always Use Feature Branches

**NEVER commit directly to main.** Main should only be a mirror of upstream.

### Feature-Based Branch Naming

Use **feature-based branch names**, not agent-number-based names:

```bash
# Good - describes what you're working on
feature/pose-download
fix/date-handling-bug
refactor/habit-card

# Avoid - doesn't describe the work
agent/humane-1
wip/stuff
```

**Why:** Feature names are self-documenting, make PRs clearer, and help when reviewing git history.

### Session Start

```bash
# 1. Start new work - ALWAYS branch from upstream/main
git fetch upstream
git checkout -b feature/my-thing upstream/main

# 2. Do work, commit, push to origin
git push -u origin feature/my-thing

# 3. Create PR to upstream
gh pr create --repo idvorkin/humane-tracker-1 --base main
```

### During Work (Commit → Push Immediately)

```bash
git pull origin feature/your-branch --rebase  # Get any updates first
git add <specific-files> && git commit -m "..."  # Use specific files, not -A
git push origin feature/your-branch              # Push right after commit!
```

Always push after every commit - keeps your work visible and safe.

### Stay Current (Rebase Often)

```bash
git fetch upstream && git rebase upstream/main
git push origin feature/your-branch --force-with-lease
```

Rebase on upstream/main:
- Before starting any major new task
- Before merging to main
- When conflicts arise

### Pre-PR Checklist (CRITICAL)

**Before creating ANY pull request, run through this checklist:**

```bash
# 1. Verify you're on a feature branch (NOT main)
git branch --show-current  # Should NOT be "main"

# 2. Fetch and rebase on upstream/main
git fetch upstream
git rebase upstream/main

# 3. Run all checks locally
just test && just e2e-desktop

# 4. Create PR to UPSTREAM (not origin!)
gh pr create --repo idvorkin/humane-tracker-1 --base main
```

**Common mistakes to AVOID:**
- ❌ Creating PR to origin (wrong - that's the fork, not upstream)
- ❌ Creating PR without rebasing first (causes merge conflicts)
- ❌ Losing track of which branch you're on
- ❌ Forgetting `--repo idvorkin/humane-tracker-1` flag

### After PR is Merged to Upstream

Reset main to stay in sync (safe because no work lives on main):

```bash
git fetch upstream
git checkout main
git reset --hard upstream/main
git push --force-with-lease origin main
```

If you have in-progress feature branches, rebase them:
```bash
git checkout feature/other-thing
git rebase upstream/main
git push --force-with-lease
```

**Git config** (set once per clone, or run `just setup`):
```bash
git config pull.rebase true  # Always rebase on pull, never merge
```

### Git Hooks

Located in `.githooks/` (activated via `just setup` or `git config core.hooksPath .githooks`):

- **pre-commit** - Syncs beads, runs biome/prettier/TypeScript checks, runs unit tests
- **pre-push** - Blocks direct pushes to main (forces PR workflow)
- **post-merge** - Auto-syncs beads after pulls

### Rules

- **✅ ORIGIN MERGES**: Agents can merge directly to origin/main (agent working repo)
- **⚠️ UPSTREAM MERGES**: Only humans merge to upstream/main. Agents must create PRs.
- **🚫 NO --no-verify**: Never use `--no-verify` to bypass hooks
- **🚫 NO FORCE PUSH**: Never use `git push --force` unless Igor explicitly types "yes"
- **🔄 REBASE OFTEN**: Always rebase before starting work: `git fetch upstream && git rebase upstream/main`
- **📦 MINIMAL PRs**: Include ONLY the changes explicitly requested. Don't bundle unrelated changes.
- **🧹 LINT FIRST**: Before making code changes, run pre-commit on affected files. Commit lint fixes first, then make your actual change.

## Guardrails

Actions requiring explicit "YES" approval from Igor:

- **Removing broken tests** - Fix the test or code, never delete failing tests
- **Pushing to upstream (idvorkin repo)** - Requires PR and human approval
- **Force pushing** - Can destroy history
- **Any action that loses work** - Deleting branches with unmerged commits, hard resets
- **`bd init --force`** - Erases the beads database

**Allowed without approval:**

- Merging to origin/main (idvorkin-ai-tools) - this is the agent working repo

**Encouraged** (not losing work): Deleting unused functions/files, removing commented-out code, cleaning unused imports - these are preserved in git history.

**End of session**: When Igor signals done or says "workflow review":

1. Review session for patterns: repeated corrections, friction, missing context
2. Ask Igor if they want to create a retro entry or update CLAUDE.md
3. For generalizable patterns, offer to PR to chop-conventions

### Collaborative Feature Branches

When a feature needs multiple agents, use a feature branch and create beads issues:

```bash
# Agent creates feature branch
git checkout -b feature/tag-system
git push -u origin feature/tag-system

# Create beads issue for help needed
bd create --title="Help needed: add tag tests on feature/tag-system" --type=task
```

**Other agent picks up work:**

```bash
bd ready                                    # Sees the help request
bd update HT-xyz --status=in_progress       # Claims it
git fetch origin
git checkout feature/tag-system             # Joins the branch
git pull --rebase
# Work, commit, push to same branch
bd close HT-xyz --reason="Done"
```

### Branch Hygiene (Every Few Days)

Run branch audit to prevent stale branch accumulation:

```bash
# List remote branches by last commit date with behind/ahead counts
for branch in $(git branch -r | grep -v HEAD | head -20); do
  behind=$(git rev-list --count origin/main ^$branch 2>/dev/null || echo "?")
  ahead=$(git rev-list --count $branch ^origin/main 2>/dev/null || echo "?")
  date=$(git log -1 --format='%ci' $branch 2>/dev/null | cut -d' ' -f1)
  echo "$date | $branch | +$ahead -$behind"
done | sort -r
```

**Delete criteria:**
- Branches 100+ commits behind with 0 unique commits (already merged)
- Branches 200+ commits behind (too stale to salvage)

**Keep criteria:**
- Active feature branches with recent work
- Branches with open PRs
- `main`, `beads-metadata`

### Clone Health Check (Weekly)

Multiple humane-tracker directories can accumulate stale state:

```bash
# Check all humane-tracker clones for issues
for dir in ~/gits/humane-tracker-*; do
  [ -d "$dir/.git" ] || continue
  cd "$dir"
  branch=$(git branch --show-current 2>/dev/null)
  ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
  changes=$(git status --porcelain 2>/dev/null | wc -l)
  if [ "$ahead" -gt 20 ] || [ "$changes" -gt 0 ]; then
    echo "⚠️  $(basename $dir): $branch (+$ahead ahead) uncommitted:$changes"
  fi
done
```

### Post-PR: Check CodeRabbit Comments

After creating a PR to upstream, CodeRabbit will review it automatically. Check for critical issues:

```bash
# View CodeRabbit comments on a PR
gh api repos/idvorkin/humane-tracker-1/pulls/PR_NUMBER/comments \
  --jq '.[] | "File: \(.path):\(.line // .original_line)\n\(.body[0:300])\n---"' | head -100
```

**Address all critical issues before merge.**

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

### Dexie Cloud Troubleshooting

**Symptom: Sync stuck in "connecting" or not syncing**

**First steps (in order):**
1. Check auth state in Settings → Sync Diagnostics
2. Log out and log back in (clears stale tokens)
3. Search web: "Dexie Cloud sync stuck [error message]"

**Known issues:**
- **Stale auth tokens**: Dexie Cloud auth expires silently. App has auto-detection, but manual re-login often fixes issues.
- **Network issues**: Check browser console for specific errors
- **Pending mutations**: Check diagnostics for mutation count

**DON'T:** Spend hours debugging sync code. Dexie Cloud is a third-party service with known quirks. Search for known issues first, debug code second.

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

### Empirical Verification Rule (IMPORTANT)

**When asked about UI behavior, ALWAYS run the dev server first.**

```bash
# DON'T: Read code and infer what should happen
# DO: Run the server and observe actual behavior
just dev
# Open browser, test the feature, THEN answer
```

**Why:** Code reading leads to wrong assumptions. Empirical verification saves time. If Igor asks "what does X look like?" or "how does Y work?", run the app and check before answering.

### Feature Completion Checklist

Before marking any feature complete:

- [ ] Tests written FIRST (TDD - test should fail before implementation)
- [ ] Tests cover edge cases (not just happy path)
- [ ] Feature verified in dev server (not just tests passing)
- [ ] Pre-commit hooks pass (`just test`)
- [ ] Rebased on upstream/main

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

**Date Handling in Tests (CRITICAL):**

Tests run on different machines and timezones. Follow these rules strictly:

```typescript
// ❌ WRONG - timezone-dependent, will cause flaky tests
const today = new Date();
expect(entry.date).toEqual(new Date());

// ✅ CORRECT - use toDateString for date comparisons
import { toDateString } from "../repositories/types";
const todayStr = toDateString(new Date());
expect(toDateString(entry.date)).toBe(todayStr);
```

**Why:** A test that passes at 11pm in one timezone may fail at 1am in another because `new Date()` crosses midnight differently.

### Clean Commits

- Run `git status` before committing to review staged files
- Use `git add <specific-files>` not `git add -A` - prevents unrelated changes creeping in
- Keep distinct changes in distinct commits
- Avoid mixing linting/formatting changes with feature changes
- Run pre-commit on affected files BEFORE making changes, commit lint fixes first
- For complex commits, write message to file and verify with Igor

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

### Test Strategy: When to Use Each Test Type

**Decision Tree:**

```
Is this testing USER BEHAVIOR (clicks, navigation, full workflows)?
  → YES: Use E2E test (Playwright in tests/)
  → NO: Continue...

Is this testing COMPONENT LOGIC (rendering, state, props)?
  → YES: Use component test (*.test.tsx with @testing-library/react)
  → NO: Continue...

Is this testing PURE FUNCTIONS (helpers, utilities, calculations)?
  → YES: Use unit test (*.test.ts)
```

**Examples:**
- ✅ E2E: "User logs in, creates habit, marks it complete"
- ✅ Component: "HabitCard renders completion state correctly"
- ✅ Unit: "toDateString() formats dates correctly"

**NEVER:**
- ❌ E2E test for component rendering logic (use component test)
- ❌ Component test for database operations (use unit test or E2E)
- ❌ Default to E2E when component tests would suffice

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

### Bug Investigation Protocol

**When you find a bug, STOP and answer these questions before fixing:**

**Spec Questions:**
1. Is this actually a bug, or is my understanding of the spec wrong?
2. Is there a missing or unclear spec that led to this?
3. **Ask Igor** if there's any ambiguity: "The behavior is X, but I expected Y. Which is correct?"

**Test Coverage Questions:**
1. Why did tests not catch this?
2. What level of our test pyramid could have caught this earliest? (unit → component → E2E)
3. Add the missing test BEFORE fixing the bug

**Architecture Questions:**
1. Is there an architectural problem that made this bug possible?
2. If yes, create a beads issue: `bd create --title="Architecture: <problem>" --type=bug`
3. **Ask Igor**: "I found an architectural issue: [description]. Type YES to address it now, or I'll just fix the immediate bug."

**Why this matters**: Bugs that are hard to test or hard to fix often signal deeper problems. Patching around bad architecture creates technical debt. Catching issues at the unit test level is 10x cheaper than E2E, and 100x cheaper than production.

**Important notes:**

- E2E tests run on both chromium (desktop) and mobile (iPhone 14 Pro) - use `just e2e-desktop` or `just e2e-mobile` to run specific projects
- If in a container, NEVER direct commit to main, always create a PR

## Retros

Run weekly (or when user says "retro"). See [chop-conventions/dev-inner-loop/retros.md](https://github.com/idvorkin/chop-conventions/blob/main/dev-inner-loop/retros.md) for process.

Storage: `retros/`

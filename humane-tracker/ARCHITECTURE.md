# Architecture

This document describes the architecture of Humane Tracker to help Claude (and developers) understand where to make changes and maintain proper boundaries.

## Overview

Humane Tracker is a React 18 + TypeScript habit tracking app with local-first storage (IndexedDB via Dexie) and optional cloud sync (Dexie Cloud).

```
┌─────────────────────────────────────────────────────────────────┐
│                         Components                               │
│  (HabitTracker, HabitSettings, TagChildPicker, etc.)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ViewModel Hooks                           │
│  (useHabitTrackerVM, useHabitService, etc.)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Services                                 │
│  (habitService, dataService, syncLogService)                    │
│  Pure business logic - no React, no side effects                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Repositories                               │
│  (habitRepository, entryRepository, affirmationLogRepository)   │
│  Data access layer - handles Date ↔ String conversion           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database (config/db.ts)                      │
│  Dexie schema, migrations, cloud sync monitoring                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         IndexedDB                                │
│  Local storage (dates as ISO strings)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
humane-tracker/src/
├── App.tsx                    # Root component: auth flow, user ID management
├── index.tsx                  # React entry point, error boundary
├── components/                # UI components (presentation + event handlers)
│   ├── HabitTracker.tsx      # Main tracker UI (uses useHabitTrackerVM)
│   ├── HabitSettings.tsx     # Habit CRUD UI
│   ├── TagChildPicker.tsx    # Tag child selection modal
│   └── ...                   # ~25 components
├── hooks/                     # React hooks (state + business logic coordination)
│   ├── useHabitTrackerVM.ts  # Main ViewModel: loads habits, manages UI state
│   └── ...
├── services/                  # Pure business logic (no React dependencies)
│   ├── habitService.ts       # Status calculations, subscriptions
│   ├── dataService.ts        # Import/export
│   └── syncLogService.ts     # Sync diagnostics (separate DB)
├── repositories/              # Data access layer (MUST use for all DB access)
│   ├── habitRepository.ts    # Habit CRUD
│   ├── entryRepository.ts    # Entry CRUD
│   ├── affirmationLogRepository.ts
│   ├── types.ts              # Record types + date converters
│   └── transactions.ts       # Cross-table transactions
├── config/                    # Database configuration
│   ├── db.ts                 # Dexie schema, migrations, sync monitoring
│   └── syncLogDB.ts          # Separate DB for sync logs (never syncs)
├── types/                     # Domain types
│   └── habit.ts              # Habit, HabitEntry, HabitStatus, etc.
├── utils/                     # Pure utility functions
│   ├── dateUtils.ts          # Date range calculations
│   ├── categoryUtils.ts      # Category colors/names
│   ├── habitTreeUtils.ts     # Tag tree building
│   ├── tagUtils.ts           # Tag-specific logic
│   └── staleAuthUtils.ts     # Auth token detection
├── constants/                 # Static data
│   └── affirmations.ts       # Affirmation text
└── data/                      # Default data
    └── defaultHabits.ts      # Default habit templates
```

## Key Architectural Rules

### 1. Repository Pattern (CRITICAL)

**NEVER access `db.habits`, `db.entries`, or `db.affirmationLogs` directly.**

Always use the repository layer:

```typescript
// ✅ CORRECT
import { habitRepository, entryRepository } from "../repositories";
const habits = await habitRepository.getByUserId(userId);
const entries = await entryRepository.getByUserId(userId);

// ❌ WRONG - bypasses date conversion
import { db } from "../config/db";
const habits = await db.habits.where("userId").equals(userId).toArray();
```

**Why?** Dates are stored as ISO strings in IndexedDB but used as `Date` objects in app code. Repositories handle this conversion automatically.

**Acceptable direct `db` imports:**
- `db.cloud.*` for auth state (App.tsx, Login.tsx, etc.)
- Migration code in `config/db.ts`
- E2E tests via `page.evaluate()` for test setup/assertions
- Repository implementations themselves

### 2. Component vs ViewModel vs Service

**Quick decision guide:**

| Question | Layer |
|----------|-------|
| Could this logic run in a CLI or API? (No React needed) | **Service** |
| Does this manage React state or subscriptions? | **ViewModel (hook)** |
| Is this just rendering JSX or delegating clicks? | **Component** |

**When does a component need a ViewModel?**
- ✅ 3+ pieces of interrelated state
- ✅ Data fetching or subscriptions
- ✅ Complex derived/computed state
- ✅ State shared between child components
- ✅ Logic worth unit testing separately
- ❌ Simple local UI state (hover, open/closed) → keep in component

#### Services (`src/services/`)

**What goes here:** Business logic independent of React.

```typescript
// ✅ Pure calculations - no React, easily testable
export function calculateHabitStatus(habit, entries): HabitStatus

// ✅ Data operations that combine multiple repos
async getHabitsWithStatus(userId): Promise<HabitWithStatus[]>

// ✅ CRUD wrappers (thin pass-through to repos is OK)
async createHabit(habit): Promise<string>
```

**What does NOT go here:**
- React state (`useState`, `useRef`)
- React effects or subscriptions management
- UI-specific transformations (grouping for display)

#### ViewModels (`src/hooks/useXxxVM.ts`)

**What goes here:** React state coordination for a feature.

```typescript
// ✅ React state
const [habits, setHabits] = useState<HabitWithStatus[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [collapsedSections, setCollapsed] = useState(new Set());

// ✅ Subscription setup with cleanup
useEffect(() => {
  const unsub = habitService.subscribeToHabits(userId, setHabits);
  return unsub;
}, [userId]);

// ✅ UI-specific derived state
const sections = useMemo(() =>
  groupHabitsByCategory(habits, collapsedSections),
  [habits, collapsedSections]
);

// ✅ Actions that update state AND/OR call services
const toggleEntry = async (habitId, date) => {
  await habitService.updateEntry(...); // DB write
  // liveQuery auto-updates state
};

// ✅ UI-specific pure functions (can be exported for testing)
export function getCellDisplay(habit, date): { content, className }
export function getNextEntryValue(current, isTag): number | null
```

#### Components (`src/components/`)

**What goes here:** Rendering and event delegation.

```typescript
// ✅ Use VM, render, delegate
function HabitTracker({ userId }) {
  const vm = useHabitTrackerVM({ userId });

  return (
    <div>
      {vm.sections.map(section => (
        <Section
          key={section.category}
          onToggle={() => vm.toggleSection(section.category)}
        />
      ))}
    </div>
  );
}

// ✅ Simple local UI state is fine in components
function HabitCell({ habit, date, onToggle }) {
  const [isHovered, setIsHovered] = useState(false); // Local only
  return <div onMouseEnter={() => setIsHovered(true)} ... />;
}
```

#### Summary Table

| Layer | React? | State? | Async? | Examples |
|-------|--------|--------|--------|----------|
| **Service** | No | No | Yes | `calculateHabitStatus()`, `getHabitsWithStatus()` |
| **ViewModel** | Yes | Yes | Via services | `useHabitTrackerVM`, collapsed state, subscriptions |
| **Component** | Yes | Local only | No | JSX, click handlers, hover state |

### 3. Date Handling

**Always use the standard helpers from `repositories/types.ts`:**

```typescript
import { toDateString, fromDateString, normalizeDate } from "../repositories/types";

// Convert Date to string for storage/comparison
const dateStr = toDateString(date);  // "YYYY-MM-DD"

// Convert string back to Date
const date = fromDateString(dateStr);

// Handle mixed Date/string from DB
const normalized = normalizeDate(value);
```

**Never create custom date formatting** - it's been a source of bugs.

## Data Flow

### Reading Data

```
Component
  └→ useHabitTrackerVM (hook)
       └→ habitService.getHabitsWithStatus()
            └→ habitRepository.getByUserId()
                 └→ db.habits.where(...) + date conversion
```

### Writing Data

```
User clicks cell
  └→ vm.toggleEntry(habitId, date)
       └→ habitService.addEntry() / updateEntry() / deleteEntry()
            └→ entryRepository.add() / update() / delete()
                 └→ db.entries.add() / update() / delete()
                      └→ Dexie Cloud sync (if configured)
                           └→ liveQuery triggers re-render
```

### Subscriptions

The app uses Dexie's `liveQuery` for real-time updates:

```typescript
// In habitService
subscribeToHabits(userId, callback) {
  const observable = liveQuery(() => habitRepository.getByUserId(userId));
  return observable.subscribe(callback);
}
```

## Database Schema

See `config/db.ts` for full schema. Key tables:

| Table | Key Fields | Purpose |
|-------|------------|---------|
| `habits` | id, userId, name, category, targetPerWeek, habitType, childIds | Habit definitions |
| `entries` | id, habitId, userId, date, value | Daily tracking entries |
| `affirmationLogs` | id, userId, date, affirmationTitle | Affirmation notes |

**Date Storage:**
- `date` fields: `YYYY-MM-DD` strings (date-only)
- `createdAt`, `updatedAt`: Full ISO timestamps

**Tag System:**
- `habitType: "tag"` marks container habits
- `childIds: string[]` lists children
- `parentIds: string[]` reverse lookup (denormalized)

## Testing Strategy

| Test Type | Location | Purpose |
|-----------|----------|---------|
| Unit tests | `src/**/*.test.ts` | Pure functions, date helpers |
| Component tests | `src/**/*.test.tsx` | React component logic |
| E2E tests | `tests/*.spec.ts` | Full user workflows |

**E2E tests use real IndexedDB** - no mocking. Use helpers from `tests/helpers/indexeddb-helpers.ts` to wait for DB state.

## Key Files by Task

### Adding a New Feature
1. **Types**: `src/types/habit.ts` (domain types)
2. **Schema**: `src/config/db.ts` (if new table/fields needed)
3. **Repository**: `src/repositories/` (data access)
4. **Service**: `src/services/` (business logic)
5. **Hook**: `src/hooks/` (state management)
6. **Component**: `src/components/` (UI)

### Fixing Date Bugs
- **Converters**: `src/repositories/types.ts`
- **Usage**: Search for `toDateString`, `normalizeDate`
- **Tests**: `src/repositories/types.test.ts`

### Debugging Sync Issues
- **Config**: `src/config/db.ts` (sync monitoring)
- **Logs**: `src/services/syncLogService.ts`
- **UI**: `src/components/SyncStatusDialog.tsx`
- **Stale Auth**: `src/utils/staleAuthUtils.ts`

### Modifying Habit Status Logic
- **Service**: `src/services/habitService.ts`
- **Tests**: `src/services/habitService.test.ts`

### Working with Tags
- **Tree Utils**: `src/utils/habitTreeUtils.ts`
- **Tag Utils**: `src/utils/tagUtils.ts`
- **Repository**: `src/repositories/habitRepository.ts` (childIds, parentIds)

## Anti-Patterns to Avoid

1. **Direct DB access outside repositories** - Breaks date conversion
2. **Business logic in components** - Hard to test
3. **Custom date formatting** - Use `toDateString()` instead
4. **Arbitrary timeouts in tests** - Use IndexedDB helpers to poll actual state
5. **Accessing `db.cloud` data tables** - `db.cloud.*` for auth only

## Migration History

| Version | Change |
|---------|--------|
| v2 | Initial schema |
| v3 | Added syncLogs (later removed) |
| v4 | Date objects → ISO strings |
| v5 | syncLogs → local-only |
| v6 | Entry dates → timestamps |
| v7 | Removed syncLogs (moved to separate DB) |
| v8 | Schema bump (variants removed) |
| v9 | Rename "Shoulder Ys" → "Shoulder Accessory" |
| v10 | Added affirmationLogs |

## External Dependencies

| Dependency | Purpose |
|------------|---------|
| `dexie` | IndexedDB wrapper |
| `dexie-cloud-addon` | Cloud sync |
| `dexie-react-hooks` | Observable hooks |
| `date-fns` | Date utilities |
| `react-error-boundary` | Error handling |

# Testing Strategy

## The Testing Pyramid

We follow the testing pyramid principle: **catch bugs as early as possible**.

```
        /\
       /  \        E2E Tests (slowest, most expensive)
      /    \       - Full user flows
     /------\      - Real browser + IndexedDB
    /        \
   /  Integ.  \    Integration Tests (medium)
  /    Tests   \   - Component + hooks together
 /--------------\  - Mock external deps
/                \
/   Unit Tests    \  Unit Tests (fastest, cheapest)
/------------------\ - Pure functions
                     - Isolated logic
```

### Why This Matters

| Test Type   | Speed | Cost to Fix | Feedback Loop |
| ----------- | ----- | ----------- | ------------- |
| Unit        | ~1ms  | Low         | Immediate     |
| Integration | ~50ms | Medium      | Fast          |
| E2E         | ~5s   | High        | Slow          |

**A bug caught in a unit test costs 10x less to fix than one caught in E2E.**

## Test Categories

### 1. Unit Tests (`src/**/*.test.ts`)

**Purpose:** Test pure functions and isolated logic in milliseconds.

**What to test:**

- Pure utility functions (no side effects)
- Data transformations
- Validation logic
- Type conversions

**Examples:**

```typescript
// ✅ Good unit test - pure function
describe("wouldCreateCycle", () => {
  it("detects direct cycle: A -> B, adding B -> A", () => {
    const habits = new Map([
      ["A", createHabit("A", "tag", ["B"])],
      ["B", createHabit("B", "tag")],
    ]);
    expect(wouldCreateCycle("B", "A", habits)).toBe(true);
  });
});

// ✅ Good unit test - data transformation
describe("getCellDisplay", () => {
  it("shows checkmark for value 1", () => {
    const result = getCellDisplay(habitWithEntry(1));
    expect(result.content).toBe("✓");
  });
});
```

**Files:**

- `src/utils/tagUtils.test.ts` - Cycle detection, descendant lookup
- `src/utils/habitTreeUtils.test.ts` - Tree building/flattening
- `src/utils/categoryUtils.test.ts` - Category helpers
- `src/repositories/types.test.ts` - Date conversion
- `src/hooks/useHabitTrackerVM.test.ts` - Pure helper functions

### 2. Component Tests (`src/components/*.test.tsx`)

**Purpose:** Test React components in isolation with mocked dependencies.

**What to test:**

- Rendering correct content
- User interactions (clicks, keyboard)
- Callback invocations
- Edge cases (empty states, errors)

**Examples:**

```typescript
// ✅ Good component test
describe("TagChildPicker", () => {
  it("calls onSelectChild with child id when clicked", () => {
    const onSelectChild = vi.fn();
    render(<TagChildPicker {...props} onSelectChild={onSelectChild} />);

    fireEvent.click(screen.getByText("Shoulder Y"));

    expect(onSelectChild).toHaveBeenCalledWith("child-1");
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(<TagChildPicker {...props} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
```

**Files:**

- `src/components/TagChildPicker.test.tsx` - Tag picker UI

### 3. Integration Tests (`src/**/*.integration.test.ts`)

**Purpose:** Test components with real hooks and mocked external services.

**What to test:**

- Component + hook interaction
- State management flows
- Complex user scenarios

**Examples:**

```typescript
// ✅ Good integration test
describe("HabitTracker with tags", () => {
  it("shows tag children when expanded", async () => {
    // Uses real useHabitTrackerVM hook with mocked habitService
    render(<HabitTracker userId="test" />);

    await waitFor(() => {
      expect(screen.getByText("Shoulder Accessory")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("expand-tag-1"));

    expect(screen.getByText("Shoulder Y")).toBeInTheDocument();
  });
});
```

### 4. E2E Tests (`tests/*.spec.ts`)

**Purpose:** Test complete user flows in real browser with real IndexedDB.

**What to test:**

- Critical user journeys
- Cross-component interactions
- Real browser APIs (IndexedDB, localStorage)

**Examples:**

```typescript
// ✅ Good E2E test - critical path
test("user can log habit entry", async ({ page }) => {
  await page.goto("/?e2e=true");
  await waitForHabitsLoaded(page);

  await page.click('[data-habit="habit-1"] [data-date="today"]');

  await waitForEntryCount(page, 1);
  expect(await getDBEntryCount(page)).toBe(1);
});
```

**Files:**

- `tests/habit-tracker.spec.ts` - Core tracking flows
- `tests/habit-click.spec.ts` - Entry interactions
- `tests/habit-settings-add.spec.ts` - CRUD operations

## Testing the Tag System

The tag system has multiple layers that each need testing:

### Layer 1: Data Utilities (Unit)

```
tagUtils.ts
├── wouldCreateCycle()     ← Prevents infinite loops
├── getDescendantRawHabits() ← Collects all children
├── getTagEntries()        ← Aggregates entries
└── getTagWeeklyCount()    ← Counts unique days
```

**Why unit test these?**

- Pure functions with no side effects
- Complex algorithms (cycle detection, DAG traversal)
- Called frequently - bugs here cascade everywhere
- Can test edge cases exhaustively

### Layer 2: Tree Building (Unit)

```
habitTreeUtils.ts
├── buildHabitTree()       ← Constructs nested structure
└── flattenTree()          ← Expands for rendering
```

**Why unit test these?**

- Transform flat list → tree → flat (round-trip)
- Expansion state affects visibility
- Easy to test all combinations

### Layer 3: Components (Component)

```
TagChildPicker.tsx
├── Renders child options
├── Handles selection
└── Keyboard/click-outside closing
```

**Why component test these?**

- UI behavior needs real DOM
- Event handling is tricky
- Accessibility matters

### Layer 4: Full Flows (E2E)

```
User Flow: Create tag → Add children → Log entry → Verify count
```

**Why E2E test these?**

- Crosses many components
- Uses real IndexedDB
- Verifies the whole system works

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - tests implementation
it("sets isExpanded to true", () => {
  expect(component.state.isExpanded).toBe(true);
});

// ✅ Good - tests behavior
it("shows children when expanded", () => {
  fireEvent.click(expandButton);
  expect(screen.getByText("Child Habit")).toBeVisible();
});
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it("works", () => { ... });

// ✅ Good
it("prevents adding a child that would create a cycle", () => { ... });
```

### 3. One Assertion Per Concept

```typescript
// ❌ Bad - testing multiple things
it("handles tag operations", () => {
  expect(createTag()).toBeDefined();
  expect(addChild()).toBe(true);
  expect(removeChild()).toBe(true);
  expect(deleteTag()).toBe(true);
});

// ✅ Good - focused tests
it("creates a tag with given name", () => { ... });
it("adds child to tag", () => { ... });
it("removes child from tag", () => { ... });
it("deletes tag", () => { ... });
```

### 4. Arrange-Act-Assert Pattern

```typescript
it("increments count when entry added", () => {
  // Arrange
  const tag = createTag({ childIds: ["habit-1"] });
  const entries = [createEntry({ habitId: "habit-1" })];

  // Act
  const count = getTagWeeklyCount(tag, habits, entries);

  // Assert
  expect(count).toBe(1);
});
```

### 5. Test Edge Cases

```typescript
describe("getTagWeeklyCount", () => {
  it("returns 0 when no entries", () => { ... });
  it("counts unique days only", () => { ... });
  it("includes tag's own entries", () => { ... });
  it("handles deeply nested tags", () => { ... });
  it("deduplicates entries from diamond DAG", () => { ... }); // Edge case!
});
```

## Running Tests

```bash
# Unit tests (fast feedback)
just test

# Specific file
npm run test -- --run src/utils/tagUtils.test.ts

# Watch mode during development
npm run test -- --watch

# E2E tests (slower, full validation)
just e2e

# E2E with visible browser
just e2e-headed
```

## Adding New Tests

When adding a new feature:

1. **Start with unit tests** for any pure functions
2. **Add component tests** for UI behavior
3. **Add E2E test** only if it's a critical user path

When fixing a bug:

1. **Write a failing test first** that reproduces the bug
2. **Fix the bug**
3. **Verify the test passes**

This ensures the bug can never regress.

# Tag Habits Specification

## Status: Implementation Complete (Phases 1-4)

**Current Phase**: Phase 5 - Variant Removal (in progress)

## Problem Statement

The current "variants" implementation embeds variant options inside a habit. This creates tight coupling between the abstract concept ("Shoulder Accessory") and its concrete implementations ("Shoulder Y", "Wall Slide", etc.).

**Issues with current approach:**

- Variants are hidden inside a single habit - not first-class entities
- Can't track individual variant progress over time
- Can't have an exercise belong to multiple groupings
- Mixing facts (what you did) with display preferences (how you view it)

## Proposed Model: Raw Habits vs Tags

### Core Principle

Separate **what you did** (raw habits + entries) from **how you think about it** (tags).

- **Raw Habits** = The actual activities you perform (facts, immutable)
- **Tags** = Logical groupings for organization and viewing (flexible, can nest)

### Visual Example

```
Mobility (tag)
  └─ Shoulder Accessory (tag)
       └─ Shoulder Y (raw)
       └─ Wall Slide (raw)
       └─ Shoulder W (raw)
       └─ Swimmers (raw)
  └─ Back Twists (raw)
  └─ Shin Boxes (raw)
  └─ Hip Work (tag)
       └─ Shin Boxes (raw)      ← same raw habit in multiple tags!
       └─ Half Lotus (raw)

Physical Health (tag)
  └─ Shoulder Accessory (tag)   ← same tag under multiple parents!
  └─ Pull Ups (raw)
  └─ TGU 28KG (raw)
```

### Key Properties

1. **Entries on any habit** - entries can be logged on raw habits OR tags directly
2. **Tags can contain raw habits OR other tags** - arbitrary nesting
3. **Tags can have multiple parents** - forms a DAG (directed acyclic graph)
4. **Raw habits can be in multiple tags** - "Shin Boxes" in both "Mobility" and "Hip Work"
5. **Counts roll up** - a tag's count = its own entries + unique entry days from all descendants

### Two Types

#### Raw Habits (The Facts)

- Concrete, specific activities you actually perform
- Examples: "Shoulder Y", "Wall Slide", "Swimmers", "Daily Selfie", "Pull Ups"
- **All entries are logged here** - this is where the data lives
- Can exist independently (doesn't need to be in a tag)
- Can belong to multiple tags simultaneously

#### Tags (The Organization)

- Logical groupings that help you think about your habits
- Examples: "Shoulder Accessory", "Mobility", "Upper Body Work"
- **Can have direct entries** - for "I did shoulder work but don't remember which"
- Count = tag's own entries + descendant raw habit entries
- Can contain raw habits and/or other tags
- Can appear under multiple parent tags
- Can have their own weekly target (for the aggregate)

## Data Model

### Habit Type

```typescript
interface Habit {
  id: string;
  name: string;
  category: string; // For top-level organization (Mobility, Relationships, etc.)
  targetPerWeek: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  trackingType?: "binary" | "sets" | "hybrid"; // Only meaningful for raw habits

  // Tag system fields
  habitType: "raw" | "tag"; // default: 'raw'
  childIds?: string[]; // if tag: IDs of children (can be raw habits OR other tags)
  parentIds?: string[]; // IDs of parent tags (for reverse lookup)

  // Visibility
  hidden?: boolean; // If true, habit is hidden from tracker view

  // DEPRECATED - being removed in Phase 5
  // variants?: HabitVariant[];
  // allowCustomVariant?: boolean;
}
```

### Entry Type

```typescript
interface HabitEntry {
  id: string;
  habitId: string; // Can point to raw habit OR tag
  userId: string;
  date: Date;
  value: number;
  notes?: string; // Freeform notes (write loose)
  createdAt: Date;

  // Structured data (structure later - via LLM parsing or manual entry)
  sets?: SetData[];
  parsed?: boolean; // Has this entry been LLM-processed?

  // DEPRECATED - being removed in Phase 5
  // variantId?: string;
  // variantName?: string;
}

interface SetData {
  weight?: number; // in kg
  reps?: number;
  duration?: number; // in seconds
}
```

### Relationship Model

```typescript
// Separate table for parent-child relationships (enables efficient queries)
interface HabitRelationship {
  id: string;
  parentId: string; // Tag ID
  childId: string; // Raw habit ID or Tag ID
  userId: string;
  createdAt: Date;
}
```

### Computed Properties for Tags

```typescript
// Get all descendant raw habits (recursive)
function getDescendantRawHabits(
  tag: Habit,
  allHabits: Map<string, Habit>,
): Habit[] {
  const results: Habit[] = [];

  for (const childId of tag.childIds ?? []) {
    const child = allHabits.get(childId);
    if (!child) continue;

    if (child.habitType === "raw") {
      results.push(child);
    } else {
      // Recurse into nested tags
      results.push(...getDescendantRawHabits(child, allHabits));
    }
  }

  return results;
}

// Get entries for a tag (tag's own entries + all descendant entries)
function getTagEntries(
  tag: Habit,
  allHabits: Map<string, Habit>,
  allEntries: HabitEntry[],
): HabitEntry[] {
  // Tag's own direct entries
  const tagOwnEntries = allEntries.filter((e) => e.habitId === tag.id);

  // Descendant raw habit entries
  const rawHabits = getDescendantRawHabits(tag, allHabits);
  const rawHabitIds = new Set(rawHabits.map((h) => h.id));
  const descendantEntries = allEntries.filter((e) =>
    rawHabitIds.has(e.habitId),
  );

  return [...tagOwnEntries, ...descendantEntries];
}

// Weekly count for a tag = unique days with tag's own entries OR any descendant entry
function getTagWeeklyCount(
  tag: Habit,
  allHabits: Map<string, Habit>,
  allEntries: HabitEntry[],
): number {
  const entries = getTagEntries(tag, allHabits, allEntries);
  const uniqueDays = new Set(entries.map((e) => formatDate(e.date)));
  return uniqueDays.size;
}
```

## Display Behavior

### Default View: Nested Tags with Expand/Collapse

```
▼ Mobility (tag)                    [●][●][●][ ][ ][ ][ ]  3/5
  ▼ Shoulder Accessory (tag)        [●][●][ ][ ][ ][ ][ ]  2/3
      Shoulder Y                    [●][ ][ ][ ][ ][ ][ ]
      Wall Slide                    [ ][●][ ][ ][ ][ ][ ]
      Swimmers                      [ ][ ][ ][ ][ ][ ][ ]
    Back Twists                     [ ][ ][●][ ][ ][ ][ ]
    Shin Boxes                      [ ][ ][ ][ ][ ][ ][ ]

  Daily Selfie (7/wk)               [●][●][●][ ][ ][ ][ ]  3/7
```

- Tags show aggregate counts (rolled up from descendants)
- Collapse a tag = hide children, still show tag's aggregate row
- Raw habits at top level (no parent tag) show normally
- Indent level indicates nesting depth

## Interaction Model

### Clicking a Raw Habit Cell

- Works exactly as today
- Cycles through values (empty → 1 → 2 → ... → empty)
- Entry logged against that specific raw habit

### Clicking a Tag Habit Cell

**Decided: Quick tap for generic, long press for specific**

This mirrors the existing variant picker UX pattern:

**Quick tap** (normal click):

- Creates entry directly on the tag itself
- For "I did shoulder work" without specifying which exercise
- Tag's count increments immediately
- Simplest, fastest interaction

**Long press** (500ms hold):

- Opens picker showing child habits: "Which one did you do?"
- Select "Shoulder Y" → entry logged to Shoulder Y (specific)
- Select "Just did one" → entry logged to tag (generic)
- Tag's count updates either way

**Why this approach:**

- No extra "Generic X" habits cluttering the list
- Quick logging when you don't care about specifics
- Detailed logging available when you want it
- Same UX pattern as variant picker (familiar)

## Management UI (HabitSettings)

### Creating a Raw Habit

```
Name: [Shoulder Y        ]
Category: [Mobility       ▼]
Target: [3] per week
Type: (●) Raw habit  ( ) Tag habit
Tags: [ ] Shoulder Accessory  [ ] Upper Body
[Create]
```

### Creating a Tag Habit

```
Name: [Shoulder Accessory ]
Category: [Mobility       ▼]
Target: [3] per week
Type: ( ) Raw habit  (●) Tag habit
Include habits:
  [x] Shoulder Y
  [x] Wall Slide
  [x] Shoulder W
  [x] Swimmers
  [ ] Pull Ups
[Create]
```

### Tag Assignment (from raw habit view)

- Each raw habit shows which tags it belongs to
- Can add/remove tag membership
- Changes don't affect historical entries

## Migration Path

### From Current Variants Model

Current state:

```
Shoulder Accessory (habit with embedded variants)
  variants: [Shoulder Y, Wall Slide, Shoulder W, Swimmers]
```

Migration to:

```
Shoulder Y (raw habit, tagged with "Shoulder Accessory")
Wall Slide (raw habit, tagged with "Shoulder Accessory")
Shoulder W (raw habit, tagged with "Shoulder Accessory")
Swimmers (raw habit, tagged with "Shoulder Accessory")
Shoulder Accessory (tag habit, includes above 4)
```

### Entry Migration

- Entries with `variantId` → convert to raw habit ID
- Entries without variant → create generic raw habit or leave orphaned

## Design Decisions

### 1. Do raw habits have their own targets?

**DECIDED: Yes (Option B)** - Both raw habits and tags can have targets.

- "Shoulder Y" can have target 2/wk, "Shoulder Accessory" can have target 3/wk
- A raw habit's status is based on its own target
- A tag's status is based on its aggregate target

### 2. How to handle a raw habit in multiple tags?

**DECIDED: Show in all parents (Option A)**

- Raw habit appears under each parent tag in the tree view
- Example: "Shin Boxes" shows under both "Mobility" and "Hip Work"
- Optional flat view toggle for future enhancement

### 3. What happens to existing categories?

**DECIDED: Keep separate for now (Option B)**

- Categories remain for color-coding/grouping display
- Tags are for aggregation/organization
- Can revisit merging them later

### 4. Can entries be logged directly on tags?

**DECIDED: Yes**

- Quick tap on tag = entry logged directly on tag (generic completion)
- Long press on tag = picker to select specific child
- Allows "I did shoulder work" without specifying which exercise
- Tag count = tag's own entries + all descendant entries

### 5. Cycle detection

**DECIDED: Validate and reject cycles**

- Validate on relationship creation
- Reject if adding a parent would create a cycle
- DAG only, no cycles allowed

## Benefits

1. **Flexibility**: Reorganize display without touching facts
2. **Multi-membership**: One activity can count toward multiple goals
3. **Clear mental model**: "I did X" vs "I'm tracking Y"
4. **Future-proof**: Easy to add new aggregation types later
5. **Analytics**: Can analyze both specific activities and categories

## Risks

1. **Complexity**: More concepts for users to understand
2. **Migration**: Existing variant data needs conversion
3. **UI clutter**: Could show too much if not designed well
4. **Performance**: Computing tag counts from raw entries

## Implementation Phases

### Phase 1: Data Model

- Add `habitType`, `childIds`, `parentIds` fields to Habit
- Add HabitRelationship table (optional, for efficient queries)
- Update repositories to handle new fields
- Cycle detection utility

### Phase 2: Tag CRUD

- Create tag habits in HabitSettings
- Add/remove children from tags
- Assign raw habits to parent tags
- Display tag membership in habit editor

### Phase 3: Tracker View

- Render nested tree structure
- Compute and display aggregate counts for tags
- Expand/collapse tag rows
- Click-on-tag → opens picker for child selection

### Phase 4: Category Migration

- Convert existing categories to top-level tags
- Move all habits under their category tags
- Remove `category` field (or keep for color only)

### Phase 5: Variant Removal (CURRENT)

**Variants are DEPRECATED and being removed.** Tags replace variants entirely.

Tasks:

1. ~~Update spec: mark variants as deprecated~~ ✓
2. Migration: convert existing variant habits to tag + raw habits
3. Migration: convert entries with variantId to raw habit entries
4. Remove variant fields from Habit type (`variants`, `allowCustomVariant`)
5. Remove variant fields from Entry type (`variantId`, `variantName`)
6. Remove VariantPicker component
7. Remove `addEntryWithVariant` from useHabitTrackerVM
8. Update/remove variant-related tests
9. Clean up variant CSS

**Why remove variants?**

- Tags solve the same problem more flexibly
- Tags allow independent targets per child
- Tags allow multi-membership (same habit in multiple groupings)
- No need to maintain two parallel systems

---

## Appendix: Model Comparison

| Aspect               | Current (Embedded Variants)       | Proposed (Raw + Tags)             |
| -------------------- | --------------------------------- | --------------------------------- |
| What holds entries   | Parent habit                      | Raw habits OR tags                |
| Grouping mechanism   | Embedded array                    | Tag relationships                 |
| Nesting depth        | 1 level (habit → variants)        | Unlimited                         |
| Multi-membership     | No                                | Yes (raw in multiple tags)        |
| Independent tracking | No (variants share parent target) | Yes (raw habits have own targets) |
| Reorganization       | Requires data changes             | Just change tag membership        |
| Complexity           | Lower                             | Higher                            |
| Migration            | N/A                               | Required                          |

## Appendix: Example Data

### Before (Current Model)

```json
{
  "id": "hbt123",
  "name": "Shoulder Accessory",
  "category": "Mobility",
  "targetPerWeek": 3,
  "variants": [
    { "id": "shoulder-y", "name": "Shoulder Y" },
    { "id": "wall-slide", "name": "Wall Slide" }
  ]
}
```

### After (Tag Model)

```json
// Tag
{
  "id": "tag456",
  "name": "Shoulder Accessory",
  "habitType": "tag",
  "targetPerWeek": 3,
  "childIds": ["hbt789", "hbt790"]
}

// Raw habits
{
  "id": "hbt789",
  "name": "Shoulder Y",
  "habitType": "raw",
  "targetPerWeek": 2,
  "parentIds": ["tag456"]
}
{
  "id": "hbt790",
  "name": "Wall Slide",
  "habitType": "raw",
  "targetPerWeek": 2,
  "parentIds": ["tag456"]
}
```

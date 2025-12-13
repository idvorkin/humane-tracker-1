# Tag Habits Specification

## Status: Draft / Under Discussion

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

1. **Raw habits are leaves** - entries are always logged against raw habits
2. **Tags can contain raw habits OR other tags** - arbitrary nesting
3. **Tags can have multiple parents** - forms a DAG (directed acyclic graph)
4. **Raw habits can be in multiple tags** - "Shin Boxes" in both "Mobility" and "Hip Work"
5. **Counts roll up** - a tag's count = sum of unique entry days from all descendants

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
- **No direct entries** - count is computed from descendant raw habits
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
}
```

### Entry Type (unchanged)

```typescript
interface HabitEntry {
  id: string;
  habitId: string; // ALWAYS points to a raw habit (never a tag)
  userId: string;
  date: Date;
  value: number;
  createdAt: Date;
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

// Get entries for a tag (from all descendant raw habits)
function getTagEntries(
  tag: Habit,
  allHabits: Map<string, Habit>,
): HabitEntry[] {
  const rawHabits = getDescendantRawHabits(tag, allHabits);
  const rawHabitIds = new Set(rawHabits.map((h) => h.id));
  return allEntries.filter((e) => rawHabitIds.has(e.habitId));
}

// Weekly count for a tag = unique days with any descendant entry
function getTagWeeklyCount(tag: Habit, allHabits: Map<string, Habit>): number {
  const entries = getTagEntries(tag, allHabits);
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

**Question: What should happen?**

**Option 1: Open picker to select raw habit**

- Click on "Shoulder Accessory" cell for Monday
- Picker opens: "Which one did you do?"
- Select "Shoulder Y" → entry logged to Shoulder Y
- Tag's count updates automatically

**Option 2: Tag cells are read-only (display only)**

- Click does nothing (or shows breakdown)
- Users must click on the specific raw habit row
- Tags purely for visualization/grouping

**Option 3: Allow "generic" tag entries**

- Quick click = creates entry on a synthetic "generic" raw habit
- Long press = opens picker for specific raw habit
- Maintains flexibility for "I did shoulder work but don't remember which"

### Recommended: Option 1 (Picker)

Most intuitive - clicking the aggregate row prompts for specifics. Users can still click directly on raw habit rows if they prefer.

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

## Open Questions

### 1. Do raw habits have their own targets?

**Option A: Only tags have targets**

- Raw habits are just logged, no individual goals
- "Shoulder Y" has no target; "Shoulder Accessory" has 3/wk
- Simpler model, but can't track specific exercise goals

**Option B: Both can have targets**

- "Shoulder Y" target 2/wk, "Shoulder Accessory" target 3/wk
- More flexible, but potentially confusing
- Which target matters for status indicators?

**Recommendation:** Option B - let both have targets. A raw habit's status is based on its own target. A tag's status is based on its aggregate target.

### 2. How to handle a raw habit in multiple tags?

If "Shoulder Y" is in both "Shoulder Accessory" and "Upper Body Work":

**Option A: Appears in both places in the tree**

- User sees it twice (under each parent)
- Could be confusing, but accurate

**Option B: Appears once, shows tag badges**

- Shows under first/primary parent
- Badge indicates other memberships
- Less cluttered

**Option C: Flat view option**

- User can toggle between tree view and flat list
- Flat list shows raw habits once with tag indicators

**Recommendation:** Option A for tree view (show in all parents), with an optional flat view toggle.

### 3. What happens to existing categories?

Current model has habits in categories (Mobility, Relationships, etc.).
New model has tags for organization.

**Option A: Categories become top-level tags**

- Migrate "Mobility" category → "Mobility" tag
- All habits in that category become children

**Option B: Keep categories separate from tags**

- Categories remain for color-coding/grouping display
- Tags are purely for aggregation

**Recommendation:** Option A - categories become tags. Cleaner unified model.

### 4. Cycle detection

With arbitrary nesting, we could create cycles:

- Tag A contains Tag B
- Tag B contains Tag A

**Solution:** Validate on relationship creation. Reject if adding a parent would create a cycle. DAG only, no cycles.

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

### Phase 5: Variant Migration

- Convert "Shoulder Accessory" with variants → tag + raw habits
- Migrate entries with variantId to new raw habit IDs
- Clean up old variant fields

---

## Appendix: Model Comparison

| Aspect               | Current (Embedded Variants)       | Proposed (Raw + Tags)             |
| -------------------- | --------------------------------- | --------------------------------- |
| What holds entries   | Parent habit                      | Raw habits only                   |
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

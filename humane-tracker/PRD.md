# Product Requirements Document (PRD)

## Humane Tracker - Habit Tracking Application

### Executive Summary

Humane Tracker is a web-based habit tracking application designed to help users build and maintain healthy habits across five key life dimensions: Movement & Mobility, Connections, Inner Balance, Joy & Play, and Strength Building. The app provides a simple, visual interface for tracking daily progress toward weekly goals with real-time synchronization.

**Status:** Live in Production
**Version:** 1.0
**Tech Stack:** React, TypeScript, Dexie Cloud
**Users:** Active deployment with Google Authentication

### Problem Statement

People struggle to maintain consistent habits across multiple areas of life. Existing habit trackers are often too complex, focus on single habits, or lack the holistic approach needed for balanced personal development. Users need a simple, visual way to track progress across multiple life dimensions while maintaining flexibility in how they define success.

### Target Users

- **Primary:** Adults aged 25-55 interested in personal development and wellness
- **Secondary:** Health-conscious individuals seeking balanced lifestyle improvements
- **Tertiary:** People recovering from burnout or seeking work-life balance

### Use Cases by Tracking Type

#### Binary (OneShot) Habits - "Did I do it?"

**Perfect for:**

- Daily routines (brush teeth, take medication)
- Yes/no achievements (went to gym, read for 30 mins)
- Single-occurrence events (morning routine, evening review)

**User Scenario:** Sarah wants to track if she completed her morning meditation. She either did it (✓) or didn't (empty). No need to count duration or repetitions.

#### Countable (Sets) Habits - "How many times?"

**Perfect for:**

- Repetitive activities (sets of exercise, glasses of water)
- Multiple daily goals (3 healthy meals, 5 fruit servings)
- Progressive challenges (increasing push-ups, pomodoros)

**User Scenario:** Mike tracks his push-up sets. He clicks once for each set completed: 1 set, 2 sets, up to 5 sets. This helps him see his daily volume.

**Important:** Weekly goals count DAYS not total sets. A target of "3 per week" means doing the habit on 3 different days, regardless of how many sets on each day.

#### Hybrid Usage - Flexibility

**Perfect for:**

- Habits that vary (sometimes binary, sometimes countable)
- Building consistency before counting
- Transitioning from simple to complex tracking

**User Scenario:** Lisa tracks "Exercise" - some days it's binary (worked out: yes/no), other days she tracks multiple sessions (morning yoga + evening walk = 2).

### Quick UX Reference Table

| Tracking Type | Click Cycle                           | Visual    | Colors          | Use Case          |
| ------------- | ------------------------------------- | --------- | --------------- | ----------------- |
| **Binary**    | empty → ✓ → empty                     | Checkmark | Green when done | Yes/No habits     |
| **Sets**      | empty → 1 → 2 → 3 → 4 → 5 → ½ → empty | Numbers   | Blue gradient   | Countable reps    |
| **Hybrid**    | Adapts: ✓ then 2,3,4,5                | Mixed     | Green/Blue      | Flexible tracking |

### Core Features

#### 1. Habit Management

**User Story:** As a user, I want to create and manage habits across different life categories so I can maintain balance in my personal development.

**Requirements:**

- Users can create habits with custom names
- Each habit belongs to one of five categories
- Users can set weekly targets (1-7 DAYS per week)
- Target represents number of days to complete habit, not total completions
- Example: "Exercise 3x/week" = exercise on 3 different days (doing 5 sets on one day still counts as 1 day)
- Habits can be deleted when no longer relevant
- System prevents duplicate habits by name

#### 2. Weekly Tracking View

**User Story:** As a user, I want to see my habits in a weekly calendar view so I can track my progress at a glance.

**Requirements:**

- Display trailing 7 days with TODAY on the LEFT (newest to oldest)
- Show all habits grouped by category
- Each day is a clickable cell for tracking
- Display weekly totals showing days completed vs target days
- Example: "3/5" means habit was done on 3 days out of 5 target days
- Completing multiple sets in one day still counts as 1 day toward goal

#### 3. Progressive Tracking System

**User Story:** As a user, I want to track different levels of completion so I can accurately reflect my effort.

**Tracking Types:**

**3.1 Binary (OneShot) Habits**

- Either done or not done (✓ or empty)
- Examples: Take vitamins, floss teeth, make bed
- Click toggles: empty → ✓ → empty
- Perfect for yes/no daily tasks

**3.2 Countable (Sets) Habits**

- Track multiple completions per day (1, 2, 3, 4, 5)
- Examples: Sets of exercise, glasses of water, pomodoros
- Click cycles: empty → 1 → 2 → 3 → 4 → 5 → empty
- Useful for repetitive activities

**3.3 Partial Completion**

- Half-done indicator (½)
- Examples: Partial workout, incomplete meditation session
- Available in cycle: ...→ 5 → ½ → empty
- Acknowledges effort even when not fully complete

**UX Specifications by Tracking Type:**

**Binary (OneShot) UX:**

- **Click behavior:** empty → ✓ → empty (2-state toggle)
- **Visual:** Large checkmark (✓) when done, empty when not
- **Cell appearance:** Light green background when checked
- **Hover state:** Shows "Click to mark done" or "Click to unmark"
- **Sound:** Subtle "ding" on completion (optional)
- **Animation:** Checkmark fades in with scale effect

**Countable (Sets) UX:**

- **Click behavior:** empty → 1 → 2 → 3 → 4 → 5 → ½ → empty
- **Visual:** Numbers displayed (1-5), half symbol (½) for partial
- **Cell appearance:**
  - 1-2: Light blue (getting started)
  - 3-4: Medium blue (good progress)
  - 5: Dark blue (maximum effort)
  - ½: Gray (partial/incomplete)
- **Hover state:** Shows "Click to add set" or "Sets: X/5"
- **Long press:** Skip to 5 (power user feature)
- **Animation:** Number slides up on increment

**Hybrid Mode UX:**

- **Smart detection:** First click = ✓, subsequent clicks = 2, 3, 4, 5
- **Visual:** Seamlessly transitions from checkmark to numbers
- **User preference:** Can lock to preferred mode in settings

**Universal UX Requirements:**

- **Response time:** <50ms visual feedback
- **Touch targets:** Minimum 44x44px for mobile
- **Keyboard support:** Space to toggle, 1-5 for direct input
- **Accessibility:** Screen reader announces state changes
- **Undo:** Shake to undo on mobile, Ctrl+Z on desktop
- **Batch operations:** Shift+click to apply to entire week
- **Confirmation:** Required for dates >2 days old
- **Visual consistency:** Same interaction patterns across all habits

#### 4. Smart Status Indicators

**User Story:** As a user, I want to see which habits need attention today so I can prioritize my efforts.

**Requirements:**

- **Status Types:**
  - Done (●): Completed today
  - Met (✓): Weekly target achieved
  - Today (⏰): Due today to stay on track
  - Tomorrow (→): Will be due tomorrow
  - Soon (clock): Due within 2-3 days
  - Overdue (!): Behind schedule
  - Pending: No immediate action needed

**Algorithm:** Calculate remaining days vs. remaining targets to determine urgency

#### 5. Category Organization

**User Story:** As a user, I want to organize habits by life areas so I can focus on specific dimensions of wellness.

**Categories with Example Habits:**

**Movement & Mobility** (Blue)

- Morning stretch (Binary): Done or not
- Yoga session (Binary): Complete session or not
- Walk 10k steps (Binary): Hit target or not
- Mobility exercises (Sets): Track 1-5 rounds

**Connections** (Green)

- Call a friend (Binary): Made call or not
- Send gratitude text (Binary): Sent or not
- Family dinner (Binary): Had dinner together or not
- Deep conversations (Sets): Track 1-5 meaningful talks

**Inner Balance** (Purple)

- Morning meditation (Binary): Completed or not
- Journal entry (Binary): Wrote or not
- Breathing exercises (Sets): Track 1-5 sessions
- Mindful moments (Sets): Track 1-5 pauses

**Joy & Play** (Pink)

- Play music (Binary): Practiced instrument or not
- Creative project (Binary): Worked on it or not
- Games/puzzles (Sets): Track 1-5 sessions
- Dance breaks (Sets): Track 1-5 dance sessions

**Strength Building** (Orange)

- Gym workout (Binary): Went to gym or not
- Push-ups (Sets): Track 1-5 sets
- Weight training (Sets): Track 1-5 exercises
- Core workout (Binary): Completed routine or not

**Requirements:**

- Collapsible sections with arrow indicators
- Color coding for visual distinction
- Expand/Collapse all functionality
- Sections remember state during session

#### 6. Summary Dashboard

**User Story:** As a user, I want to see my overall progress so I can understand my performance at a glance.

**Requirements:**

- Display counts for: Due Today, Overdue, Done Today, On Track
- Update in real-time as habits are tracked
- Positioned prominently at top of interface

#### 7. Authentication & Data Persistence

**User Story:** As a user, I want my data to sync across devices so I can track habits anywhere.

**Requirements:**

- Google Sign-In authentication
- Anonymous mode for testing
- Real-time synchronization with Dexie Cloud
- Offline capability with local caching
- Data isolated per user

### Technical Specifications

#### Frontend

- **Framework:** React with TypeScript
- **Styling:** CSS with dark theme
- **State Management:** React hooks (useState, useEffect)
- **Date Handling:** date-fns library

#### Backend

- **Database:** Dexie (IndexedDB) with Dexie Cloud sync
- **Authentication:** Dexie Cloud Auth
- **Hosting:** Surge / Vercel
- **Real-time Updates:** Dexie liveQuery

#### Data Models

**Habit:**

```typescript
{
  id: string;
  name: string;
  category: "mobility" | "connection" | "balance" | "joy" | "strength";
  trackingType: "binary" | "sets" | "hybrid"; // New field
  targetPerWeek: number(1 - 7); // Number of DAYS per week to do habit
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**HabitEntry:**

```typescript
{
  id: string
  habitId: string
  userId: string
  date: Date
  value: number (0.5, 1, 2, 3, 4, or 5)
  createdAt: Date
}
```

### Performance Requirements

- Initial load time: < 3 seconds
- Habit click response: < 100ms (optimistic updates)
- Cloud sync: Background, non-blocking
- Support 100+ habits per user
- Handle 1000+ entries per user

### User Experience Requirements

- **Responsive Design:** Works on desktop, tablet, and mobile
- **Dark Theme:** Reduce eye strain for extended use
- **Accessibility:** Keyboard navigation, screen reader support
- **Error Handling:** Graceful degradation, clear error messages
- **Loading States:** Skeleton screens during data fetch

### Visual Design Guidelines

#### Cell States by Tracking Type

**Binary (OneShot) Cells:**

```
Empty: [ ]           Light gray border, no fill
Done:  [✓]          Green background (#10b981), white checkmark
Hover: [ ]          Subtle green border glow
```

**Countable (Sets) Cells:**

```
Empty: [ ]           Light gray border, no fill
1 Set: [1]          Light blue (#dbeafe), dark text
2 Set: [2]          Slightly darker blue (#bfdbfe)
3 Set: [3]          Medium blue (#93c5fd)
4 Set: [4]          Darker blue (#60a5fa)
5 Set: [5]          Deep blue (#3b82f6), white text
Half:  [½]          Gray (#9ca3af), italic
```

**Visual Feedback:**

- **Click:** Cell briefly scales to 95% then back to 100%
- **Success:** Green pulse animation for binary, blue pulse for sets
- **Invalid:** Red shake animation for backdated without confirmation
- **Loading:** Subtle spinner overlay during save

**Mobile Optimizations:**

- Larger touch targets (minimum 48x48px)
- Swipe right to mark done (binary)
- Swipe up to increment (sets)
- Haptic feedback on completion
- Bottom sheet for batch operations

### Success Metrics

- **Adoption:** 100+ active users within first month
- **Engagement:** Users track habits 5+ days per week
- **Retention:** 60% users active after 30 days
- **Performance:** <1% error rate in production
- **Satisfaction:** 4+ star rating in user feedback

### Implementation Status

#### ✅ Implemented Features

- [x] User authentication (Google Sign-in)
- [x] Habit creation and management
- [x] 5 life categories with color coding
- [x] Weekly trailing 7-day view (newest to oldest)
- [x] Progressive tracking (binary and sets)
- [x] Click cycling (empty → 1-5 → ½ → empty)
- [x] Real-time sync with Dexie Cloud
- [x] Smart status indicators
- [x] Collapsible category sections
- [x] Summary statistics dashboard
- [x] Habit deduplication
- [x] Mobile responsive design
- [x] Dark theme
- [x] Optimistic UI updates
- [x] Confirmation for backdated entries

#### 🚧 In Progress

- [ ] Binary vs Sets tracking type selection
- [ ] Improved onboarding flow

#### 📋 Planned (See ROADMAP.md)

- Analytics & insights
- Social features
- Advanced tracking options
- Mobile apps
- See [ROADMAP.md](./ROADMAP.md) for detailed future features

### Risks & Mitigations

| Risk                              | Impact   | Mitigation                                       |
| --------------------------------- | -------- | ------------------------------------------------ |
| Cloud costs exceed budget         | High     | Implement usage quotas, optimize queries         |
| Users abandon due to complexity   | High     | Keep UI simple, provide onboarding               |
| Data loss                         | Critical | Regular backups, data validation                 |
| Slow performance with many habits | Medium   | Pagination, virtual scrolling                    |
| Authentication issues             | High     | Fallback to anonymous mode, clear error messages |

### Development Status

**Current Version:** v1.0 - Core Features Complete
**Environment:** Production (Surge)
**Next Release:** v1.1 - Tracking Type Selection

### Acceptance Criteria (v1.0)

- [x] Users can create, track, and delete habits
- [x] Weekly view displays correctly with dates
- [x] Click cycling works as specified
- [x] Status indicators calculate correctly
- [x] Data persists across sessions
- [x] Performance meets requirements (<100ms updates)
- [x] Works on mobile devices
- [x] Authentication flow is smooth
- [x] No critical bugs in production

### Links

- **Live App:** https://humane-tracker.surge.sh
- **Repository:** [GitHub - idvorkin/humane-tracker-1]
- **Future Features:** [ROADMAP.md](./ROADMAP.md)

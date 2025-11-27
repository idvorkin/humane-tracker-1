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

```bash
cd humane-tracker
npm run dev       # Run development server - opens http://localhost:3000
npm run build     # Build for production (tsc + vite build)
npm test          # Run unit tests (Vitest)
npm run test:e2e  # Run E2E tests (Playwright)
```

## Code Quality

- **Biome** for formatting (tabs, double quotes) and linting - runs via pre-commit hook
- **Vitest** for unit tests (jsdom environment)
- **Playwright** for E2E tests (in `tests/` directory)

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

### Key Files

- `src/db.ts` - Database schema and Dexie configuration
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

### Debugging

1. Read error messages carefully
2. Reproduce consistently before investigating
3. Check recent changes (git diff)
4. Find working examples to compare against
5. Form a single hypothesis and test minimally

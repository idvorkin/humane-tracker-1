/**
 * IndexedDB Testing Helpers for Playwright
 *
 * These helpers wait for actual IndexedDB changes instead of using arbitrary timeouts.
 * Based on community best practices from playwright-indexeddb and Playwright docs.
 */

import type { Page } from '@playwright/test';

/**
 * Wait for an entry to be created in IndexedDB
 * This polls IndexedDB directly to check if the entry exists
 */
export async function waitForEntryInDB(
  page: Page,
  options: {
    timeout?: number;
    polling?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, polling = 100 } = options;

  await page.waitForFunction(
    async () => {
      try {
        // Access Dexie from the page context
        const { db } = await import('/src/config/db.ts');
        const entryCount = await db.entries.count();
        console.log('[waitForEntryInDB] Entry count:', entryCount);
        return entryCount > 0;
      } catch (error) {
        console.error('[waitForEntryInDB] Error checking DB:', error);
        return false;
      }
    },
    { timeout, polling }
  );
}

/**
 * Wait for a specific number of entries in IndexedDB
 */
export async function waitForEntryCount(
  page: Page,
  expectedCount: number,
  options: {
    timeout?: number;
    polling?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, polling = 100 } = options;

  await page.waitForFunction(
    async (count: number) => {
      try {
        const { db } = await import('/src/config/db.ts');
        const entryCount = await db.entries.count();
        console.log('[waitForEntryCount] Entry count:', entryCount, 'expected:', count);
        return entryCount >= count;
      } catch (error) {
        console.error('[waitForEntryCount] Error:', error);
        return false;
      }
    },
    expectedCount,
    { timeout, polling }
  );
}

/**
 * Wait for habit data to be loaded (at least one habit exists)
 */
export async function waitForHabitsLoaded(
  page: Page,
  options: {
    timeout?: number;
    polling?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, polling = 100 } = options;

  await page.waitForFunction(
    async () => {
      try {
        const { db } = await import('/src/config/db.ts');
        const habitCount = await db.habits.count();
        console.log('[waitForHabitsLoaded] Habit count:', habitCount);
        return habitCount > 0;
      } catch (error) {
        console.error('[waitForHabitsLoaded] Error:', error);
        return false;
      }
    },
    { timeout, polling }
  );
}

/**
 * Wait for DOM element to have specific text content
 * This combines DOM and IndexedDB waiting
 */
export async function waitForCellContent(
  page: Page,
  selector: string,
  expectedPattern: RegExp | string,
  options: {
    timeout?: number;
    polling?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, polling = 100 } = options;

  await page.waitForFunction(
    ({ sel, pattern }: { sel: string; pattern: string }) => {
      const cell = document.querySelector(sel);
      if (!cell) return false;

      const content = cell.textContent?.trim() || '';
      console.log('[waitForCellContent] Cell content:', content, 'pattern:', pattern);

      // Check if content matches pattern
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        // It's a regex pattern
        const regex = new RegExp(pattern.slice(1, -1));
        return regex.test(content);
      }
      return content === pattern;
    },
    {
      sel: selector,
      pattern: expectedPattern instanceof RegExp ? expectedPattern.source : expectedPattern
    },
    { timeout, polling }
  );
}

/**
 * Get entry count from IndexedDB
 */
export async function getDBEntryCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const { db } = await import('/src/config/db.ts');
    return await db.entries.count();
  });
}

/**
 * Get habit count from IndexedDB
 */
export async function getDBHabitCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const { db } = await import('/src/config/db.ts');
    return await db.habits.count();
  });
}

/**
 * Clear all IndexedDB data for clean test state
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { db } = await import('/src/config/db.ts');
    await db.habits.clear();
    await db.entries.clear();
    console.log('[clearIndexedDB] Cleared all data');
  });
}

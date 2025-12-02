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

  try {
    await page.waitForFunction(
      async () => {
        // Let errors propagate - no try-catch here
        const { db } = await import('/src/config/db.ts');
        const entryCount = await db.entries.count();
        console.log('[waitForEntryInDB] Entry count:', entryCount);
        return entryCount > 0;
      },
      { timeout, polling }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      throw new Error(
        `Timeout waiting for entry to be created in IndexedDB. ` +
        `This usually means entries are not being created. ` +
        `Check that habit clicks and entry creation are working correctly. ` +
        `Original error: ${error.message}`
      );
    }
    throw new Error(
      `Failed to wait for entry in DB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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

  try {
    await page.waitForFunction(
      async (count: number) => {
        // Let errors propagate - no try-catch here
        const { db } = await import('/src/config/db.ts');
        const entryCount = await db.entries.count();
        console.log('[waitForEntryCount] Entry count:', entryCount, 'expected:', count);
        return entryCount >= count;
      },
      expectedCount,
      { timeout, polling }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      throw new Error(
        `Timeout waiting for entry count to reach ${expectedCount}. ` +
        `This usually means entries are not being created in IndexedDB. ` +
        `Check that habit clicks and entry creation are working correctly. ` +
        `Original error: ${error.message}`
      );
    }
    throw new Error(
      `Failed to wait for entry count: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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

  try {
    await page.waitForFunction(
      async () => {
        // Let errors propagate - no try-catch here
        const { db } = await import('/src/config/db.ts');
        const habitCount = await db.habits.count();
        console.log('[waitForHabitsLoaded] Habit count:', habitCount);
        return habitCount > 0;
      },
      { timeout, polling }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      throw new Error(
        `Timeout waiting for habits to be loaded in IndexedDB. ` +
        `This usually means habits are not being created or loaded. ` +
        `Check that habit initialization is working correctly. ` +
        `Original error: ${error.message}`
      );
    }
    throw new Error(
      `Failed to wait for habits loaded: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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

  try {
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      throw new Error(
        `Timeout waiting for cell content to match pattern. ` +
        `Selector: ${selector}, Expected: ${expectedPattern}. ` +
        `Original error: ${error.message}`
      );
    }
    throw new Error(
      `Failed to wait for cell content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get entry count from IndexedDB
 */
export async function getDBEntryCount(page: Page): Promise<number> {
  try {
    return await page.evaluate(async () => {
      try {
        const { db } = await import('/src/config/db.ts');
        return await db.entries.count();
      } catch (error) {
        throw new Error(
          `Failed to count entries in IndexedDB: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to execute getDBEntryCount: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get habit count from IndexedDB
 */
export async function getDBHabitCount(page: Page): Promise<number> {
  try {
    return await page.evaluate(async () => {
      try {
        const { db } = await import('/src/config/db.ts');
        return await db.habits.count();
      } catch (error) {
        throw new Error(
          `Failed to count habits in IndexedDB: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to execute getDBHabitCount: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clear all IndexedDB data for clean test state
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  try {
    await page.evaluate(async () => {
      try {
        const { db } = await import('/src/config/db.ts');
        await db.habits.clear();
        await db.entries.clear();
        console.log('[clearIndexedDB] Cleared all data');
      } catch (error) {
        throw new Error(
          `Failed to clear IndexedDB: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to execute clearIndexedDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

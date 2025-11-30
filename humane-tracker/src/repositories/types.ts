/**
 * Database record types - what's actually stored in IndexedDB.
 * Dates are stored as ISO strings for consistency.
 */

export interface HabitRecord {
	id: string;
	name: string;
	category: string;
	targetPerWeek: number;
	trackingType?: "binary" | "sets" | "hybrid";
	userId: string;
	createdAt: string; // ISO string
	updatedAt: string; // ISO string
}

export interface EntryRecord {
	id: string;
	habitId: string;
	userId: string;
	date: string; // ISO string (date portion only: YYYY-MM-DD)
	value: number;
	notes?: string;
	createdAt: string; // ISO string
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD) for storage.
 * Uses local timezone - the date you see is the date stored.
 */
export function toDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Convert an ISO date string (YYYY-MM-DD) to a Date at midnight local time.
 */
export function fromDateString(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

/**
 * Convert a Date to a full ISO timestamp string for storage.
 */
export function toTimestamp(date: Date): string {
	return date.toISOString();
}

/**
 * Convert an ISO timestamp string to a Date.
 */
export function fromTimestamp(timestamp: string): Date {
	return new Date(timestamp);
}

/**
 * Normalize a date value from the database.
 * Handles both Date objects (legacy) and strings (new format).
 */
export function normalizeDate(value: Date | string): Date {
	if (value instanceof Date) {
		return value;
	}
	// Check if it's a date-only string (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return fromDateString(value);
	}
	// Full ISO timestamp
	return fromTimestamp(value);
}

/**
 * Normalize a date-only value from the database to YYYY-MM-DD string.
 * Handles both Date objects (legacy) and strings (new format).
 */
export function normalizeDateString(value: Date | string): string {
	if (value instanceof Date) {
		return toDateString(value);
	}
	// Check if it's already a date-only string
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}
	// Full ISO timestamp - extract date portion
	return toDateString(new Date(value));
}

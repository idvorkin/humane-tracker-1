/**
 * Database record types - what's stored in IndexedDB.
 * Dates are being migrated from Date objects to ISO strings.
 * During migration, both formats may exist and are normalized on read.
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
	date: string; // ISO timestamp (full date+time)
	value: number;
	notes?: string;
	createdAt: string; // ISO string
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD) in local timezone.
 * Used for comparisons and display, NOT for storage.
 */
export function toDateString(date: Date): string {
	if (!(date instanceof Date)) {
		throw new TypeError(
			`toDateString: Expected Date object, got ${typeof date}: ${date}`,
		);
	}
	if (Number.isNaN(date.getTime())) {
		throw new Error(`toDateString: Invalid date object (NaN): ${date}`);
	}
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Convert an ISO date string (YYYY-MM-DD) to a Date at midnight local time.
 */
export function fromDateString(dateStr: string): Date {
	if (typeof dateStr !== "string") {
		throw new TypeError(
			`fromDateString: Expected string, got ${typeof dateStr}: ${dateStr}`,
		);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		throw new Error(
			`fromDateString: Invalid date string format: "${dateStr}". Expected YYYY-MM-DD`,
		);
	}
	const [year, month, day] = dateStr.split("-").map(Number);
	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		throw new Error(
			`fromDateString: Date string contains non-numeric values: "${dateStr}"`,
		);
	}
	const date = new Date(year, month - 1, day);
	if (Number.isNaN(date.getTime())) {
		throw new Error(
			`fromDateString: Invalid date values in string: "${dateStr}"`,
		);
	}
	// Verify round-trip to catch invalid dates like 2023-02-30
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		throw new Error(
			`fromDateString: Invalid date (e.g., Feb 30): "${dateStr}"`,
		);
	}
	return date;
}

/**
 * Convert a Date to a full ISO timestamp string for storage.
 */
export function toTimestamp(date: Date): string {
	if (!(date instanceof Date)) {
		throw new TypeError(
			`toTimestamp: Expected Date object, got ${typeof date}: ${date}`,
		);
	}
	if (Number.isNaN(date.getTime())) {
		throw new Error(`toTimestamp: Invalid date object (NaN): ${date}`);
	}
	return date.toISOString();
}

/**
 * Convert an ISO timestamp string to a Date.
 */
export function fromTimestamp(timestamp: string): Date {
	if (typeof timestamp !== "string") {
		throw new TypeError(
			`fromTimestamp: Expected string, got ${typeof timestamp}: ${timestamp}`,
		);
	}
	if (!timestamp.trim()) {
		throw new Error("fromTimestamp: Empty string is not a valid timestamp");
	}
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`fromTimestamp: Invalid timestamp string: "${timestamp}"`);
	}
	return date;
}

/**
 * Normalize a date value from the database to a Date object.
 * Handles Date objects (from pre-v4 DBs or in-memory objects) and
 * ISO strings (from v4+ DBs). Supports both date-only (YYYY-MM-DD)
 * and full timestamps.
 */
export function normalizeDate(value: Date | string): Date {
	if (value === null || value === undefined) {
		throw new Error(
			`normalizeDate: Received ${value}, expected Date or string`,
		);
	}
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			throw new Error("normalizeDate: Date object is invalid (NaN)");
		}
		return value;
	}
	if (typeof value !== "string") {
		throw new TypeError(
			`normalizeDate: Expected Date or string, got ${typeof value}: ${value}`,
		);
	}
	if (!value.trim()) {
		throw new Error("normalizeDate: Empty string is not a valid date");
	}
	// Check if it's a date-only string (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return fromDateString(value);
	}
	// Full ISO timestamp
	return fromTimestamp(value);
}

/**
 * Create start-of-day and end-of-day Date boundaries for a date range.
 * Useful for querying entries within a specific date range.
 */
export function toDateRange(
	startDate: Date,
	endDate: Date,
): { rangeStart: Date; rangeEnd: Date } {
	const rangeStart = new Date(startDate);
	rangeStart.setHours(0, 0, 0, 0);
	const rangeEnd = new Date(endDate);
	rangeEnd.setHours(23, 59, 59, 999);
	return { rangeStart, rangeEnd };
}

/**
 * Normalize a date value from the database to YYYY-MM-DD string in local timezone.
 * Handles both Date objects, date-only strings (YYYY-MM-DD), and full ISO timestamps.
 */
export function normalizeDateString(value: Date | string): string {
	if (value === null || value === undefined) {
		throw new Error(
			`normalizeDateString: Received ${value}, expected Date or string`,
		);
	}
	if (value instanceof Date) {
		return toDateString(value);
	}
	if (typeof value !== "string") {
		throw new TypeError(
			`normalizeDateString: Expected Date or string, got ${typeof value}: ${value}`,
		);
	}
	if (!value.trim()) {
		throw new Error("normalizeDateString: Empty string is not a valid date");
	}
	// Check if it's a date-only string (legacy format)
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		// Validate using fromDateString (includes round-trip validation for Feb 30, etc.)
		fromDateString(value); // Will throw if invalid
		return value;
	}
	// Full ISO timestamp - extract date portion in local timezone
	return toDateString(fromTimestamp(value));
}

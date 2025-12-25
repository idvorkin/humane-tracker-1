/**
 * Database record types - what's stored in IndexedDB.
 * Dates are being migrated from Date objects to ISO strings.
 * During migration, both formats may exist and are normalized on read.
 */

export type HabitType = "raw" | "tag";

/**
 * Valid values for targetPerWeek: 1-7 days per week.
 * Runtime-validated via validateTargetPerWeek() in habitRepository.ts.
 * Note: Using `number` instead of union type to avoid TypeScript friction
 * with form inputs and state management. The validation function ensures
 * values are always clamped to [1,7] at runtime.
 */
export type TargetPerWeek = number;

export interface HabitRecord {
	id: string;
	name: string;
	category: string;
	targetPerWeek: TargetPerWeek;
	trackingType?: "binary" | "sets" | "hybrid";
	userId: string;
	createdAt: string; // ISO string
	updatedAt: string; // ISO string

	// Tag system fields
	habitType?: HabitType; // 'raw' (default) or 'tag'
	childIds?: string[]; // For tags: IDs of children (raw habits or other tags)
	parentIds?: string[]; // For reverse lookup: which tags contain this habit

	// Visibility
	hidden?: boolean; // If true, habit is hidden from tracker view
}

// Structured set data for "write loose, structure later"
export interface SetDataRecord {
	weight?: number; // in kg
	reps?: number;
	duration?: number; // in seconds
}

/**
 * Valid entry values:
 * - 0: Not done / zeroed out
 * - 0.5: Partial completion (binary habits only)
 * - 1: Complete (binary habits)
 * - 2+: Count of sets (sets/hybrid habits)
 *
 * Runtime-validated via validateEntryValue().
 */
export type EntryValue = number;

/**
 * Validates that a value is a valid entry value.
 * Valid values: 0, 0.5, or any non-negative integer.
 * @throws Error if value is invalid (negative, invalid decimal, NaN, Infinity)
 */
export function validateEntryValue(value: number): EntryValue {
	if (typeof value !== "number") {
		throw new TypeError(
			`validateEntryValue: Expected number, got ${typeof value}: ${value}`,
		);
	}
	if (Number.isNaN(value)) {
		throw new Error("validateEntryValue: Value cannot be NaN");
	}
	if (!Number.isFinite(value)) {
		throw new Error(`validateEntryValue: Value must be finite, got ${value}`);
	}
	if (value < 0) {
		throw new Error(
			`validateEntryValue: Value cannot be negative, got ${value}`,
		);
	}
	// Allow 0, 0.5, or any non-negative integer
	if (value !== 0 && value !== 0.5 && !Number.isInteger(value)) {
		throw new Error(
			`validateEntryValue: Value must be 0, 0.5, or a non-negative integer, got ${value}`,
		);
	}
	return value;
}

/**
 * Checks if a value is a valid entry value without throwing.
 */
export function isValidEntryValue(value: unknown): value is EntryValue {
	if (typeof value !== "number") return false;
	if (Number.isNaN(value)) return false;
	if (!Number.isFinite(value)) return false;
	if (value < 0) return false;
	if (value !== 0 && value !== 0.5 && !Number.isInteger(value)) return false;
	return true;
}

export interface EntryRecord {
	id: string;
	habitId: string;
	userId: string;
	date: string; // ISO string (date portion only: YYYY-MM-DD)
	value: EntryValue;
	notes?: string; // Freeform notes (write loose)
	createdAt: string; // ISO string

	// Structured data (structure later - via LLM parsing or manual entry)
	sets?: SetDataRecord[];
	parsed?: boolean; // Has this entry been LLM-processed?
}

export interface AffirmationLogRecord {
	id: string;
	userId: string;
	affirmationTitle: string;
	logType: "opportunity" | "didit";
	note: string;
	date: string; // ISO string (date portion only: YYYY-MM-DD)
	createdAt: string; // ISO string
}

export type TranscriptionStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed";

export type RecordingContext = "opportunity" | "didit" | "grateful";

export interface AudioRecordingRecord {
	id: string; // "aud..." prefix, local-only (no @ prefix = no cloud sync)
	userId: string;
	audioBlob: Blob; // The actual audio data
	mimeType: string; // e.g., "audio/webm;codecs=opus"
	durationMs: number; // Recording duration in milliseconds
	affirmationTitle: string; // Which affirmation this relates to
	recordingContext: RecordingContext; // Context for the recording
	date: string; // ISO string (date portion only: YYYY-MM-DD)
	createdAt: string; // ISO string
	transcriptionStatus: TranscriptionStatus;
	transcriptionText?: string; // Filled in after transcription
	transcriptionError?: string; // Error message if failed
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD) for storage.
 * Uses local timezone - the date you see is the date stored.
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
 * Normalize a date-only value from the database to YYYY-MM-DD string.
 * Handles both Date objects (legacy) and strings (new format).
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
	// Check if it's already a date-only string
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		// Validate using fromDateString (includes round-trip validation for Feb 30, etc.)
		fromDateString(value); // Will throw if invalid
		return value;
	}
	// Full ISO timestamp - extract date portion
	return toDateString(fromTimestamp(value));
}

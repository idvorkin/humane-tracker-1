import { describe, expect, it } from "vitest";
import {
	fromDateString,
	fromTimestamp,
	isValidEntryValue,
	normalizeDate,
	normalizeDateString,
	toDateString,
	toTimestamp,
	validateEntryValue,
} from "./types";

describe("toDateString", () => {
	it("converts a Date to YYYY-MM-DD format", () => {
		const date = new Date(2024, 0, 15); // Jan 15, 2024
		expect(toDateString(date)).toBe("2024-01-15");
	});

	it("pads single-digit months and days with zero", () => {
		const date = new Date(2024, 0, 5); // Jan 5, 2024
		expect(toDateString(date)).toBe("2024-01-05");
	});

	it("throws TypeError when input is not a Date", () => {
		expect(() => toDateString("2024-01-15" as unknown as Date)).toThrow(
			TypeError,
		);
		expect(() => toDateString("2024-01-15" as unknown as Date)).toThrow(
			/Expected Date object/,
		);
	});

	it("throws Error when Date is invalid (NaN)", () => {
		const invalidDate = new Date("invalid");
		expect(() => toDateString(invalidDate)).toThrow(Error);
		expect(() => toDateString(invalidDate)).toThrow(/Invalid date object/);
	});

	it("handles dates at year boundaries", () => {
		expect(toDateString(new Date(2024, 0, 1))).toBe("2024-01-01");
		expect(toDateString(new Date(2024, 11, 31))).toBe("2024-12-31");
	});
});

describe("fromDateString", () => {
	it("converts YYYY-MM-DD string to Date at midnight local time", () => {
		const date = fromDateString("2024-01-15");
		expect(date.getFullYear()).toBe(2024);
		expect(date.getMonth()).toBe(0); // January is 0
		expect(date.getDate()).toBe(15);
		expect(date.getHours()).toBe(0);
		expect(date.getMinutes()).toBe(0);
	});

	it("throws TypeError when input is not a string", () => {
		expect(() => fromDateString(123 as unknown as string)).toThrow(TypeError);
		expect(() => fromDateString(123 as unknown as string)).toThrow(
			/Expected string/,
		);
	});

	it("throws Error for invalid date string format", () => {
		expect(() => fromDateString("15-01-2024")).toThrow(Error);
		expect(() => fromDateString("15-01-2024")).toThrow(
			/Invalid date string format/,
		);
		expect(() => fromDateString("2024/01/15")).toThrow(/Expected YYYY-MM-DD/);
	});

	it("throws Error for date string with non-numeric values", () => {
		expect(() => fromDateString("20XX-01-15")).toThrow(Error);
		expect(() => fromDateString("20XX-01-15")).toThrow(
			/Invalid date string format/,
		);
	});

	it("throws Error for invalid date values (e.g., Feb 30)", () => {
		expect(() => fromDateString("2024-02-30")).toThrow(Error);
		expect(() => fromDateString("2024-02-30")).toThrow(/Invalid date.*Feb 30/);
	});

	it("throws Error for month out of range", () => {
		expect(() => fromDateString("2024-13-01")).toThrow(Error);
	});

	it("throws Error for day out of range", () => {
		expect(() => fromDateString("2024-01-32")).toThrow(Error);
	});

	it("accepts valid leap year date", () => {
		const date = fromDateString("2024-02-29"); // 2024 is a leap year
		expect(date.getFullYear()).toBe(2024);
		expect(date.getMonth()).toBe(1);
		expect(date.getDate()).toBe(29);
	});

	it("rejects Feb 29 on non-leap year", () => {
		expect(() => fromDateString("2023-02-29")).toThrow(Error);
	});
});

describe("toTimestamp", () => {
	it("converts a Date to ISO string", () => {
		const date = new Date("2024-01-15T10:30:00.000Z");
		const timestamp = toTimestamp(date);
		expect(timestamp).toBe("2024-01-15T10:30:00.000Z");
	});

	it("throws TypeError when input is not a Date", () => {
		expect(() => toTimestamp("2024-01-15" as unknown as Date)).toThrow(
			TypeError,
		);
		expect(() => toTimestamp("2024-01-15" as unknown as Date)).toThrow(
			/Expected Date object/,
		);
	});

	it("throws Error when Date is invalid (NaN)", () => {
		const invalidDate = new Date("invalid");
		expect(() => toTimestamp(invalidDate)).toThrow(Error);
		expect(() => toTimestamp(invalidDate)).toThrow(/Invalid date object/);
	});
});

describe("fromTimestamp", () => {
	it("converts ISO string to Date", () => {
		const date = fromTimestamp("2024-01-15T10:30:00.000Z");
		expect(date.toISOString()).toBe("2024-01-15T10:30:00.000Z");
	});

	it("throws TypeError when input is not a string", () => {
		expect(() => fromTimestamp(123 as unknown as string)).toThrow(TypeError);
		expect(() => fromTimestamp(123 as unknown as string)).toThrow(
			/Expected string/,
		);
	});

	it("throws Error for empty string", () => {
		expect(() => fromTimestamp("")).toThrow(Error);
		expect(() => fromTimestamp("")).toThrow(/Empty string/);
	});

	it("throws Error for invalid timestamp string", () => {
		expect(() => fromTimestamp("not a date")).toThrow(Error);
		expect(() => fromTimestamp("not a date")).toThrow(/Invalid timestamp/);
	});

	it("handles timestamps with milliseconds", () => {
		const timestamp = "2024-01-15T10:30:45.123Z";
		const date = fromTimestamp(timestamp);
		expect(date.toISOString()).toBe(timestamp);
	});
});

describe("normalizeDate", () => {
	it("returns Date object unchanged when valid", () => {
		const date = new Date("2024-01-15T10:30:00.000Z");
		const normalized = normalizeDate(date);
		expect(normalized).toBe(date);
		expect(normalized.toISOString()).toBe("2024-01-15T10:30:00.000Z");
	});

	it("throws Error when Date is invalid (NaN)", () => {
		const invalidDate = new Date("invalid");
		expect(() => normalizeDate(invalidDate)).toThrow(Error);
		expect(() => normalizeDate(invalidDate)).toThrow(/Date object is invalid/);
	});

	it("converts YYYY-MM-DD string to Date", () => {
		const date = normalizeDate("2024-01-15");
		expect(date.getFullYear()).toBe(2024);
		expect(date.getMonth()).toBe(0);
		expect(date.getDate()).toBe(15);
	});

	it("converts ISO timestamp string to Date", () => {
		const date = normalizeDate("2024-01-15T10:30:00.000Z");
		expect(date.toISOString()).toBe("2024-01-15T10:30:00.000Z");
	});

	it("throws Error for null", () => {
		expect(() => normalizeDate(null as unknown as Date)).toThrow(Error);
		expect(() => normalizeDate(null as unknown as Date)).toThrow(
			/Received null/,
		);
	});

	it("throws Error for undefined", () => {
		expect(() => normalizeDate(undefined as unknown as Date)).toThrow(Error);
		expect(() => normalizeDate(undefined as unknown as Date)).toThrow(
			/Received undefined/,
		);
	});

	it("throws TypeError for non-Date, non-string input", () => {
		expect(() => normalizeDate(123 as unknown as Date)).toThrow(TypeError);
		expect(() => normalizeDate(123 as unknown as Date)).toThrow(
			/Expected Date or string/,
		);
	});

	it("throws Error for empty string", () => {
		expect(() => normalizeDate("")).toThrow(Error);
		expect(() => normalizeDate("")).toThrow(/Empty string/);
	});

	it("throws Error for whitespace-only string", () => {
		expect(() => normalizeDate("   ")).toThrow(Error);
		expect(() => normalizeDate("   ")).toThrow(/Empty string/);
	});
});

describe("normalizeDateString", () => {
	it("returns Date object as YYYY-MM-DD string", () => {
		const date = new Date(2024, 0, 15);
		expect(normalizeDateString(date)).toBe("2024-01-15");
	});

	it("returns valid YYYY-MM-DD string unchanged", () => {
		expect(normalizeDateString("2024-01-15")).toBe("2024-01-15");
	});

	it("extracts date from ISO timestamp", () => {
		const result = normalizeDateString("2024-01-15T10:30:00.000Z");
		expect(result).toBe("2024-01-15");
	});

	it("throws Error for null", () => {
		expect(() => normalizeDateString(null as unknown as Date)).toThrow(Error);
		expect(() => normalizeDateString(null as unknown as Date)).toThrow(
			/Received null/,
		);
	});

	it("throws Error for undefined", () => {
		expect(() => normalizeDateString(undefined as unknown as Date)).toThrow(
			Error,
		);
		expect(() => normalizeDateString(undefined as unknown as Date)).toThrow(
			/Received undefined/,
		);
	});

	it("throws TypeError for non-Date, non-string input", () => {
		expect(() => normalizeDateString(123 as unknown as Date)).toThrow(
			TypeError,
		);
		expect(() => normalizeDateString(123 as unknown as Date)).toThrow(
			/Expected Date or string/,
		);
	});

	it("throws Error for empty string", () => {
		expect(() => normalizeDateString("")).toThrow(Error);
		expect(() => normalizeDateString("")).toThrow(/Empty string/);
	});

	it("throws Error for invalid date string (Feb 30)", () => {
		expect(() => normalizeDateString("2024-02-30")).toThrow(Error);
	});

	it("handles valid leap year date", () => {
		expect(normalizeDateString("2024-02-29")).toBe("2024-02-29");
	});
});

describe("Round-trip conversions", () => {
	it("toDateString -> fromDateString produces same logical date", () => {
		const original = new Date(2024, 0, 15);
		const str = toDateString(original);
		const restored = fromDateString(str);

		expect(restored.getFullYear()).toBe(original.getFullYear());
		expect(restored.getMonth()).toBe(original.getMonth());
		expect(restored.getDate()).toBe(original.getDate());
	});

	it("toTimestamp -> fromTimestamp produces same instant", () => {
		const original = new Date("2024-01-15T10:30:45.123Z");
		const str = toTimestamp(original);
		const restored = fromTimestamp(str);

		expect(restored.toISOString()).toBe(original.toISOString());
	});

	it("normalizeDate handles both Date and string consistently", () => {
		const date = new Date(2024, 0, 15);
		const dateStr = "2024-01-15";

		const fromDate = normalizeDate(date);
		const fromString = normalizeDate(dateStr);

		expect(fromDate.getFullYear()).toBe(fromString.getFullYear());
		expect(fromDate.getMonth()).toBe(fromString.getMonth());
		expect(fromDate.getDate()).toBe(fromString.getDate());
	});

	it("normalizeDateString handles both Date and string consistently", () => {
		const date = new Date(2024, 0, 15);
		const dateStr = "2024-01-15";

		expect(normalizeDateString(date)).toBe("2024-01-15");
		expect(normalizeDateString(dateStr)).toBe("2024-01-15");
	});
});

describe("validateEntryValue", () => {
	it("accepts 0 (not done)", () => {
		expect(validateEntryValue(0)).toBe(0);
	});

	it("accepts 0.5 (partial)", () => {
		expect(validateEntryValue(0.5)).toBe(0.5);
	});

	it("accepts 1 (complete)", () => {
		expect(validateEntryValue(1)).toBe(1);
	});

	it("accepts positive integers (set counts)", () => {
		expect(validateEntryValue(2)).toBe(2);
		expect(validateEntryValue(5)).toBe(5);
		expect(validateEntryValue(100)).toBe(100);
	});

	it("throws Error for negative values", () => {
		expect(() => validateEntryValue(-1)).toThrow(Error);
		expect(() => validateEntryValue(-1)).toThrow(/cannot be negative/);
		expect(() => validateEntryValue(-0.5)).toThrow(/cannot be negative/);
	});

	it("throws Error for invalid decimals (not 0.5)", () => {
		expect(() => validateEntryValue(0.3)).toThrow(Error);
		expect(() => validateEntryValue(0.3)).toThrow(/must be 0, 0.5, or a non-negative integer/);
		expect(() => validateEntryValue(1.7)).toThrow(/must be 0, 0.5, or a non-negative integer/);
		expect(() => validateEntryValue(2.5)).toThrow(/must be 0, 0.5, or a non-negative integer/);
	});

	it("throws Error for NaN", () => {
		expect(() => validateEntryValue(Number.NaN)).toThrow(Error);
		expect(() => validateEntryValue(Number.NaN)).toThrow(/cannot be NaN/);
	});

	it("throws Error for Infinity", () => {
		expect(() => validateEntryValue(Number.POSITIVE_INFINITY)).toThrow(Error);
		expect(() => validateEntryValue(Number.POSITIVE_INFINITY)).toThrow(/must be finite/);
		expect(() => validateEntryValue(Number.NEGATIVE_INFINITY)).toThrow(/must be finite/);
	});

	it("throws TypeError for non-number input", () => {
		expect(() => validateEntryValue("1" as unknown as number)).toThrow(TypeError);
		expect(() => validateEntryValue("1" as unknown as number)).toThrow(/Expected number/);
	});
});

describe("isValidEntryValue", () => {
	it("returns true for valid values", () => {
		expect(isValidEntryValue(0)).toBe(true);
		expect(isValidEntryValue(0.5)).toBe(true);
		expect(isValidEntryValue(1)).toBe(true);
		expect(isValidEntryValue(5)).toBe(true);
	});

	it("returns false for negative values", () => {
		expect(isValidEntryValue(-1)).toBe(false);
		expect(isValidEntryValue(-0.5)).toBe(false);
	});

	it("returns false for invalid decimals", () => {
		expect(isValidEntryValue(0.3)).toBe(false);
		expect(isValidEntryValue(1.7)).toBe(false);
	});

	it("returns false for NaN", () => {
		expect(isValidEntryValue(Number.NaN)).toBe(false);
	});

	it("returns false for Infinity", () => {
		expect(isValidEntryValue(Number.POSITIVE_INFINITY)).toBe(false);
	});

	it("returns false for non-number types", () => {
		expect(isValidEntryValue("1")).toBe(false);
		expect(isValidEntryValue(null)).toBe(false);
		expect(isValidEntryValue(undefined)).toBe(false);
		expect(isValidEntryValue({})).toBe(false);
	});
});

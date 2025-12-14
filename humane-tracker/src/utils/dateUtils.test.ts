import { describe, expect, it } from "vitest";
import { getTrailingWeekDateRange } from "./dateUtils";

describe("getTrailingWeekDateRange", () => {
	it("returns a 7-day range ending today", () => {
		const referenceDate = new Date("2024-03-15T12:00:00");
		const { startDate, endDate } = getTrailingWeekDateRange(referenceDate);

		// Start should be 6 days back from reference (7 days total including reference)
		expect(startDate.getFullYear()).toBe(2024);
		expect(startDate.getMonth()).toBe(2); // March (0-indexed)
		expect(startDate.getDate()).toBe(9); // March 9th

		// End date should match reference date
		expect(endDate.getDate()).toBe(15);
	});

	it("sets start date to beginning of day (00:00:00.000)", () => {
		const referenceDate = new Date("2024-03-15T14:30:45.123");
		const { startDate } = getTrailingWeekDateRange(referenceDate);

		expect(startDate.getHours()).toBe(0);
		expect(startDate.getMinutes()).toBe(0);
		expect(startDate.getSeconds()).toBe(0);
		expect(startDate.getMilliseconds()).toBe(0);
	});

	it("sets end date to end of day (23:59:59.999)", () => {
		const referenceDate = new Date("2024-03-15T09:15:00");
		const { endDate } = getTrailingWeekDateRange(referenceDate);

		expect(endDate.getHours()).toBe(23);
		expect(endDate.getMinutes()).toBe(59);
		expect(endDate.getSeconds()).toBe(59);
		expect(endDate.getMilliseconds()).toBe(999);
	});

	it("preserves the reference date for end date", () => {
		const referenceDate = new Date("2024-07-20T16:00:00");
		const { endDate } = getTrailingWeekDateRange(referenceDate);

		expect(endDate.getFullYear()).toBe(2024);
		expect(endDate.getMonth()).toBe(6); // July (0-indexed)
		expect(endDate.getDate()).toBe(20);
	});

	it("handles month boundaries correctly", () => {
		// March 3rd - going back 6 days crosses into February
		const referenceDate = new Date("2024-03-03T12:00:00");
		const { startDate, endDate } = getTrailingWeekDateRange(referenceDate);

		expect(startDate.getMonth()).toBe(1); // February
		expect(startDate.getDate()).toBe(26);
		expect(endDate.getMonth()).toBe(2); // March
		expect(endDate.getDate()).toBe(3);
	});

	it("handles year boundaries correctly", () => {
		// January 3rd - going back 6 days crosses into December
		const referenceDate = new Date("2024-01-03T12:00:00");
		const { startDate, endDate } = getTrailingWeekDateRange(referenceDate);

		expect(startDate.getFullYear()).toBe(2023);
		expect(startDate.getMonth()).toBe(11); // December
		expect(startDate.getDate()).toBe(28);
		expect(endDate.getFullYear()).toBe(2024);
		expect(endDate.getMonth()).toBe(0); // January
	});

	it("handles leap year February correctly", () => {
		// March 1st 2024 (leap year) - going back includes Feb 29th
		const referenceDate = new Date("2024-03-01T12:00:00");
		const { startDate } = getTrailingWeekDateRange(referenceDate);

		expect(startDate.getMonth()).toBe(1); // February
		expect(startDate.getDate()).toBe(24); // Feb 24th
	});

	it("defaults to current date when no argument provided", () => {
		const before = new Date();
		const { startDate, endDate } = getTrailingWeekDateRange();
		const after = new Date();

		// End date should be today
		expect(endDate.getDate()).toBeGreaterThanOrEqual(before.getDate() - 1);
		expect(endDate.getDate()).toBeLessThanOrEqual(after.getDate() + 1);

		// Range spans 7 calendar days (today + 6 previous days)
		// Start is at 00:00:00.000, end is at 23:59:59.999
		const msPerDay = 1000 * 60 * 60 * 24;
		const daysDiff = Math.round(
			(endDate.getTime() - startDate.getTime()) / msPerDay,
		);
		expect(daysDiff).toBe(7); // Full 7-day span from start to end
	});
});

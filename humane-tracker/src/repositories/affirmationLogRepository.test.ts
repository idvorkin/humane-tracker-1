import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../config/db";
import {
	affirmationLogRepository,
	validateAffirmationLog,
} from "./affirmationLogRepository";
import { toDateString } from "./types";

describe("affirmationLogRepository", () => {
	const testUserId = "test-user-123";

	beforeEach(async () => {
		// Clear test data
		await db.affirmationLogs.clear();
	});

	afterEach(async () => {
		await db.affirmationLogs.clear();
	});

	describe("create", () => {
		it("creates an affirmation log with correct data", async () => {
			const testDate = new Date();

			const id = await affirmationLogRepository.create({
				userId: testUserId,
				affirmationTitle: "Do It Anyways",
				logType: "opportunity",
				note: "I will apply discipline today",
				date: testDate,
			});

			expect(id).toMatch(/^aff/);

			const record = await db.affirmationLogs.get(id);
			expect(record).toBeDefined();
			expect(record?.userId).toBe(testUserId);
			expect(record?.affirmationTitle).toBe("Do It Anyways");
			expect(record?.logType).toBe("opportunity");
			expect(record?.note).toBe("I will apply discipline today");
			// Use toDateString for timezone-safe comparison
			expect(record?.date).toBe(toDateString(testDate));
		});

		it("creates logs with didit type", async () => {
			const id = await affirmationLogRepository.create({
				userId: testUserId,
				affirmationTitle: "Calm Like Water",
				logType: "didit",
				note: "Stayed present in a difficult meeting",
				date: new Date(),
			});

			const record = await db.affirmationLogs.get(id);
			expect(record?.logType).toBe("didit");
		});
	});

	describe("getByUserId", () => {
		it("returns all logs for a user", async () => {
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			await affirmationLogRepository.create({
				userId: testUserId,
				affirmationTitle: "Do It Anyways",
				logType: "opportunity",
				note: "Note 1",
				date: today,
			});

			await affirmationLogRepository.create({
				userId: testUserId,
				affirmationTitle: "A Class Act",
				logType: "didit",
				note: "Note 2",
				date: tomorrow,
			});

			await affirmationLogRepository.create({
				userId: "other-user",
				affirmationTitle: "Test",
				logType: "opportunity",
				note: "Other user note",
				date: today,
			});

			const logs = await affirmationLogRepository.getByUserId(testUserId);

			expect(logs).toHaveLength(2);
			expect(logs.every((l) => l.userId === testUserId)).toBe(true);
		});

		it("returns empty array when no logs exist", async () => {
			const logs = await affirmationLogRepository.getByUserId("nonexistent");
			expect(logs).toHaveLength(0);
		});
	});

	describe("getByUserIdAndDate", () => {
		it("returns logs for specific date", async () => {
			const targetDate = new Date();
			const differentDate = new Date(targetDate);
			differentDate.setDate(differentDate.getDate() + 1);

			await affirmationLogRepository.create({
				userId: testUserId,
				affirmationTitle: "Do It Anyways",
				logType: "opportunity",
				note: "Target day note",
				date: targetDate,
			});

			await affirmationLogRepository.create({
				userId: testUserId,
				affirmationTitle: "A Class Act",
				logType: "didit",
				note: "Different day note",
				date: differentDate,
			});

			const logs = await affirmationLogRepository.getByUserIdAndDate(
				testUserId,
				targetDate,
			);

			expect(logs).toHaveLength(1);
			expect(logs[0].note).toBe("Target day note");
		});
	});

	describe("validateAffirmationLog", () => {
		const validLog = {
			userId: "user-123",
			affirmationTitle: "Do It Anyways",
			logType: "opportunity" as const,
			note: "Test note",
			date: new Date(),
		};

		it("accepts valid log data", () => {
			expect(() => validateAffirmationLog(validLog)).not.toThrow();
		});

		it("throws on empty userId", () => {
			expect(() => validateAffirmationLog({ ...validLog, userId: "" })).toThrow(
				"userId cannot be empty",
			);
		});

		it("throws on whitespace-only userId", () => {
			expect(() =>
				validateAffirmationLog({ ...validLog, userId: "   " }),
			).toThrow("userId cannot be empty");
		});

		it("throws on empty affirmationTitle", () => {
			expect(() =>
				validateAffirmationLog({ ...validLog, affirmationTitle: "" }),
			).toThrow("affirmationTitle cannot be empty");
		});

		it("throws on whitespace-only affirmationTitle", () => {
			expect(() =>
				validateAffirmationLog({ ...validLog, affirmationTitle: "   " }),
			).toThrow("affirmationTitle cannot be empty");
		});

		it("throws on invalid logType", () => {
			expect(() =>
				validateAffirmationLog({
					...validLog,
					logType: "invalid" as "opportunity",
				}),
			).toThrow('logType must be "opportunity" or "didit"');
		});

		it("accepts opportunity logType", () => {
			expect(() =>
				validateAffirmationLog({ ...validLog, logType: "opportunity" }),
			).not.toThrow();
		});

		it("accepts didit logType", () => {
			expect(() =>
				validateAffirmationLog({ ...validLog, logType: "didit" }),
			).not.toThrow();
		});
	});
});

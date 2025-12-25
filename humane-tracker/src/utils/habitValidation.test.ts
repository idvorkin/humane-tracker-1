import { describe, expect, it } from "vitest";
import { validateHabitForm } from "./habitValidation";

describe("validateHabitForm", () => {
	describe("valid input", () => {
		it("returns valid for name and category", () => {
			const result = validateHabitForm({
				name: "Morning Run",
				category: "Exercise",
			});

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("returns valid for trimmed whitespace inputs", () => {
			const result = validateHabitForm({
				name: "  Morning Run  ",
				category: "  Exercise  ",
			});

			expect(result.isValid).toBe(true);
		});
	});

	describe("name validation", () => {
		it("returns error for empty name", () => {
			const result = validateHabitForm({
				name: "",
				category: "Exercise",
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Habit name is required");
		});

		it("returns error for whitespace-only name", () => {
			const result = validateHabitForm({
				name: "   ",
				category: "Exercise",
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Habit name is required");
		});
	});

	describe("category validation", () => {
		it("returns error for empty category", () => {
			const result = validateHabitForm({
				name: "Morning Run",
				category: "",
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.category).toBe("Category is required");
		});

		it("returns error for whitespace-only category", () => {
			const result = validateHabitForm({
				name: "Morning Run",
				category: "   ",
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.category).toBe("Category is required");
		});
	});

	describe("multiple errors", () => {
		it("returns all errors when both fields are empty", () => {
			const result = validateHabitForm({
				name: "",
				category: "",
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Habit name is required");
			expect(result.errors.category).toBe("Category is required");
		});
	});

	describe("length validation", () => {
		it("returns error for name over 100 characters", () => {
			const longName = "a".repeat(101);
			const result = validateHabitForm({
				name: longName,
				category: "Exercise",
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe(
				"Habit name must be 100 characters or less",
			);
		});

		it("accepts name exactly 100 characters", () => {
			const exactName = "a".repeat(100);
			const result = validateHabitForm({
				name: exactName,
				category: "Exercise",
			});

			expect(result.isValid).toBe(true);
		});

		it("returns error for category over 50 characters", () => {
			const longCategory = "b".repeat(51);
			const result = validateHabitForm({
				name: "Morning Run",
				category: longCategory,
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.category).toBe(
				"Category must be 50 characters or less",
			);
		});

		it("accepts category exactly 50 characters", () => {
			const exactCategory = "b".repeat(50);
			const result = validateHabitForm({
				name: "Morning Run",
				category: exactCategory,
			});

			expect(result.isValid).toBe(true);
		});

		it("returns both length errors when both fields are too long", () => {
			const result = validateHabitForm({
				name: "a".repeat(101),
				category: "b".repeat(51),
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe(
				"Habit name must be 100 characters or less",
			);
			expect(result.errors.category).toBe(
				"Category must be 50 characters or less",
			);
		});
	});
});

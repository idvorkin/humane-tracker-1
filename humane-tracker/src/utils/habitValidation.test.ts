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
});

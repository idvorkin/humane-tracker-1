import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	validateCategory,
	validateHabitName,
	validateTargetPerWeek,
} from "./habitRepository";

describe("validateHabitName", () => {
	it("returns trimmed name for valid input", () => {
		expect(validateHabitName("  Exercise  ")).toBe("Exercise");
		expect(validateHabitName("Meditation")).toBe("Meditation");
	});

	it("throws Error for empty string", () => {
		expect(() => validateHabitName("")).toThrow(Error);
		expect(() => validateHabitName("")).toThrow(/Habit name cannot be empty/);
	});

	it("throws Error for whitespace-only string", () => {
		expect(() => validateHabitName("   ")).toThrow(Error);
		expect(() => validateHabitName("   ")).toThrow(
			/Habit name cannot be empty/,
		);
	});

	it("handles names with special characters", () => {
		expect(validateHabitName("Morning walk (30min)")).toBe(
			"Morning walk (30min)",
		);
		expect(validateHabitName("Read: 20 pages")).toBe("Read: 20 pages");
	});
});

describe("validateCategory", () => {
	it("returns trimmed category for valid input", () => {
		expect(validateCategory("  mobility  ")).toBe("mobility");
		expect(validateCategory("health")).toBe("health");
	});

	it("throws Error for empty string", () => {
		expect(() => validateCategory("")).toThrow(Error);
		expect(() => validateCategory("")).toThrow(/Category cannot be empty/);
	});

	it("throws Error for whitespace-only string", () => {
		expect(() => validateCategory("   ")).toThrow(Error);
		expect(() => validateCategory("   ")).toThrow(/Category cannot be empty/);
	});

	it("handles categories with special characters", () => {
		expect(validateCategory("work-life")).toBe("work-life");
		expect(validateCategory("self_care")).toBe("self_care");
	});
});

describe("validateTargetPerWeek", () => {
	beforeEach(() => {
		// Clear console mocks before each test
		vi.clearAllMocks();
	});

	it("returns valid values unchanged", () => {
		expect(validateTargetPerWeek(1)).toBe(1);
		expect(validateTargetPerWeek(3)).toBe(3);
		expect(validateTargetPerWeek(7)).toBe(7);
	});

	it("clamps values below minimum to 1", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		expect(validateTargetPerWeek(0)).toBe(1);
		expect(validateTargetPerWeek(-5)).toBe(1);
		expect(consoleWarnSpy).toHaveBeenCalled();
		consoleWarnSpy.mockRestore();
	});

	it("clamps values above maximum to 7", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		expect(validateTargetPerWeek(8)).toBe(7);
		expect(validateTargetPerWeek(100)).toBe(7);
		expect(consoleWarnSpy).toHaveBeenCalled();
		consoleWarnSpy.mockRestore();
	});

	it("returns default for NaN", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		expect(validateTargetPerWeek(Number.NaN)).toBe(3);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Invalid targetPerWeek"),
		);
		consoleWarnSpy.mockRestore();
	});

	it("returns default for non-number input", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		expect(validateTargetPerWeek("5" as unknown as number)).toBe(3);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Invalid targetPerWeek"),
		);
		consoleWarnSpy.mockRestore();
	});

	it("logs warning when clamping to minimum", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		validateTargetPerWeek(0);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("below minimum"),
		);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Clamping to 1"),
		);
		consoleWarnSpy.mockRestore();
	});

	it("logs warning when clamping to maximum", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		validateTargetPerWeek(10);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("above maximum"),
		);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Clamping to 7"),
		);
		consoleWarnSpy.mockRestore();
	});

	it("logs warning with actual value when using default", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		validateTargetPerWeek(Number.NaN);
		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("NaN"));
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("default value 3"),
		);
		consoleWarnSpy.mockRestore();
	});

	it("handles decimal values by clamping", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		expect(validateTargetPerWeek(3.7)).toBe(3.7);
		expect(validateTargetPerWeek(0.5)).toBe(1);
		expect(validateTargetPerWeek(7.5)).toBe(7);
		consoleWarnSpy.mockRestore();
	});
});

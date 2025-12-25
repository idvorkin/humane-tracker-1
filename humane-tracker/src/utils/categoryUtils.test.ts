import { describe, expect, it } from "vitest";
import {
	buildCategoryInfo,
	extractCategories,
	getCategoryColor,
	migrateCategoryValue,
} from "./categoryUtils";

describe("getCategoryColor", () => {
	it("returns gray for empty string", () => {
		expect(getCategoryColor("")).toBe("#94a3b8");
	});

	it("returns gray for whitespace-only string", () => {
		expect(getCategoryColor("   ")).toBe("#94a3b8");
		expect(getCategoryColor("\t")).toBe("#94a3b8");
	});

	it("returns valid HSL color for normal category", () => {
		const color = getCategoryColor("Mobility");
		expect(color).toMatch(/^hsl\(\d+, 70%, 60%\)$/);
	});

	it("returns same color for same input (deterministic)", () => {
		const color1 = getCategoryColor("Mobility");
		const color2 = getCategoryColor("Mobility");
		const color3 = getCategoryColor("Mobility");
		expect(color1).toBe(color2);
		expect(color2).toBe(color3);
	});

	it("returns different colors for different inputs", () => {
		const mobility = getCategoryColor("Mobility");
		const relationships = getCategoryColor("Relationships");
		const emotional = getCategoryColor("Emotional Health");

		expect(mobility).not.toBe(relationships);
		expect(relationships).not.toBe(emotional);
		expect(mobility).not.toBe(emotional);
	});

	it("is case-sensitive", () => {
		const lower = getCategoryColor("mobility");
		const upper = getCategoryColor("Mobility");
		expect(lower).not.toBe(upper);
	});
});

describe("migrateCategoryValue", () => {
	it.each([
		["mobility", "Mobility"],
		["connection", "Relationships"],
		["balance", "Emotional Health"],
		["joy", "Smile and Wonder"],
		["strength", "Physical Health"],
	])("migrates legacy enum '%s' to '%s'", (input, expected) => {
		expect(migrateCategoryValue(input)).toBe(expected);
	});

	it.each([
		["Movement & Mobility", "Mobility"],
		["Connections", "Relationships"],
		["Inner Balance", "Emotional Health"],
		["Joy & Play", "Smile and Wonder"],
		["Strength Building", "Physical Health"],
	])("migrates legacy display name '%s' to '%s'", (input, expected) => {
		expect(migrateCategoryValue(input)).toBe(expected);
	});

	it("passes through already-migrated values unchanged", () => {
		expect(migrateCategoryValue("Mobility")).toBe("Mobility");
		expect(migrateCategoryValue("Relationships")).toBe("Relationships");
		expect(migrateCategoryValue("Emotional Health")).toBe("Emotional Health");
		expect(migrateCategoryValue("Smile and Wonder")).toBe("Smile and Wonder");
		expect(migrateCategoryValue("Physical Health")).toBe("Physical Health");
	});

	it("passes through unknown values unchanged", () => {
		expect(migrateCategoryValue("Custom Category")).toBe("Custom Category");
		expect(migrateCategoryValue("My Habits")).toBe("My Habits");
		expect(migrateCategoryValue("Work")).toBe("Work");
	});

	it("handles empty string", () => {
		expect(migrateCategoryValue("")).toBe("");
	});
});

describe("extractCategories", () => {
	it("returns empty array for empty habits", () => {
		expect(extractCategories([])).toEqual([]);
	});

	it("returns single category for single habit", () => {
		const habits = [{ category: "Mobility" }];
		expect(extractCategories(habits)).toEqual(["Mobility"]);
	});

	it("deduplicates categories", () => {
		const habits = [
			{ category: "Mobility" },
			{ category: "Mobility" },
			{ category: "Mobility" },
		];
		expect(extractCategories(habits)).toEqual(["Mobility"]);
	});

	it("preserves first-appearance order", () => {
		const habits = [
			{ category: "Relationships" },
			{ category: "Mobility" },
			{ category: "Relationships" },
			{ category: "Emotional Health" },
			{ category: "Mobility" },
		];
		expect(extractCategories(habits)).toEqual([
			"Relationships",
			"Mobility",
			"Emotional Health",
		]);
	});

	it("filters out habits with empty category", () => {
		const habits = [
			{ category: "" },
			{ category: "Mobility" },
			{ category: "" },
		];
		expect(extractCategories(habits)).toEqual(["Mobility"]);
	});

	it("filters out habits with undefined or null category", () => {
		const habits = [
			{ category: undefined },
			{ category: "Mobility" },
			{ category: null },
			{ category: "Health" },
		];
		expect(extractCategories(habits as Array<{ category?: string | null }>)).toEqual(["Mobility", "Health"]);
	});

	it("filters out habits with whitespace-only category", () => {
		const habits = [
			{ category: "   " },
			{ category: "Mobility" },
			{ category: "\t" },
		];
		expect(extractCategories(habits)).toEqual(["Mobility"]);
	});

	it("treats different case as different categories", () => {
		const habits = [{ category: "mobility" }, { category: "Mobility" }];
		expect(extractCategories(habits)).toEqual(["mobility", "Mobility"]);
	});
});

describe("buildCategoryInfo", () => {
	it("returns name and color properties", () => {
		const info = buildCategoryInfo("Mobility");
		expect(info).toHaveProperty("name");
		expect(info).toHaveProperty("color");
	});

	it("returns category as name", () => {
		const info = buildCategoryInfo("Custom Category");
		expect(info.name).toBe("Custom Category");
	});

	it("uses getCategoryColor for color generation", () => {
		const info = buildCategoryInfo("Mobility");
		const expectedColor = getCategoryColor("Mobility");
		expect(info.color).toBe(expectedColor);
	});

	it("handles empty category", () => {
		const info = buildCategoryInfo("");
		expect(info.name).toBe("");
		expect(info.color).toBe("#94a3b8");
	});
});

import type { Habit } from "../types/habit";

/**
 * Simple string hash function for deterministic color generation.
 * Returns a positive integer.
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash | 0; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

/**
 * Generate a deterministic HSL color from a category string.
 * Same input always produces same color.
 */
export function getCategoryColor(category: string): string {
	if (!category || category.trim() === "") {
		return "#94a3b8"; // Gray for empty/uncategorized
	}

	const hash = hashString(category);
	const hue = hash % 360;

	// Use 70% saturation and 60% lightness for vibrant, readable colors
	return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Legacy migration map: old enum values -> new display names
 */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
	// Old enum values
	mobility: "Mobility",
	connection: "Relationships",
	balance: "Emotional Health",
	joy: "Smile and Wonder",
	strength: "Physical Health",
	// Old display names
	"Movement & Mobility": "Mobility",
	Connections: "Relationships",
	"Inner Balance": "Emotional Health",
	"Joy & Play": "Smile and Wonder",
	"Strength Building": "Physical Health",
};

/**
 * Migrate old enum-based category values to display names.
 * If already a display name, returns as-is.
 */
export function migrateCategoryValue(oldValue: string): string {
	return LEGACY_CATEGORY_MAP[oldValue] || oldValue;
}

/**
 * Extract unique categories from habits array, preserving first-appearance order.
 * Filters out undefined, null, or empty categories.
 */
export function extractCategories(
	habits: Array<{ category?: string | null }>,
): string[] {
	const seen = new Set<string>();
	const categories: string[] = [];

	for (const habit of habits) {
		const category = habit.category;
		// Skip undefined, null, or empty categories
		if (!category || typeof category !== "string" || !category.trim()) {
			continue;
		}
		if (!seen.has(category)) {
			seen.add(category);
			categories.push(category);
		}
	}

	return categories;
}

/**
 * Build CategoryInfo object from a category string.
 */
export function buildCategoryInfo(category: string): {
	name: string;
	color: string;
} {
	return {
		name: category,
		color: getCategoryColor(category),
	};
}

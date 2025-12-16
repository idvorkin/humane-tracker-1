export interface HabitFormData {
	name: string;
	category: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: {
		name?: string;
		category?: string;
	};
}

/**
 * Validate habit form data (name and category).
 * Returns validation result with specific error messages.
 */
export function validateHabitForm(data: HabitFormData): ValidationResult {
	const errors: ValidationResult["errors"] = {};

	if (!data.name || !data.name.trim()) {
		errors.name = "Habit name is required";
	}

	if (!data.category || !data.category.trim()) {
		errors.category = "Category is required";
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
}

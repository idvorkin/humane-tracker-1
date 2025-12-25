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

// Maximum lengths for habit form fields
const MAX_NAME_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 50;

/**
 * Validate habit form data (name and category).
 * Returns validation result with specific error messages.
 */
export function validateHabitForm(data: HabitFormData): ValidationResult {
	const errors: ValidationResult["errors"] = {};

	if (!data.name || !data.name.trim()) {
		errors.name = "Habit name is required";
	} else if (data.name.trim().length > MAX_NAME_LENGTH) {
		errors.name = `Habit name must be ${MAX_NAME_LENGTH} characters or less`;
	}

	if (!data.category || !data.category.trim()) {
		errors.category = "Category is required";
	} else if (data.category.trim().length > MAX_CATEGORY_LENGTH) {
		errors.category = `Category must be ${MAX_CATEGORY_LENGTH} characters or less`;
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
}

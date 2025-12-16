import type React from "react";
import { useState } from "react";
import { useHabitService } from "../hooks/useHabitService";
import { buildCategoryInfo } from "../utils/categoryUtils";
import { validateHabitForm } from "../utils/habitValidation";
import "./HabitManager.css";

interface HabitManagerProps {
	userId: string;
	onClose: () => void;
	existingCategories: string[];
}

export const HabitManager: React.FC<HabitManagerProps> = ({
	userId,
	onClose,
	existingCategories,
}) => {
	const habitService = useHabitService();
	const [habitName, setHabitName] = useState("");
	const [category, setCategory] = useState("Mobility");
	const [targetPerWeek, setTargetPerWeek] = useState(3);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const categoryInfo = buildCategoryInfo(category);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const validation = validateHabitForm({ name: habitName, category });
		if (!validation.isValid) {
			setError(validation.errors.name || validation.errors.category || "");
			return;
		}

		setLoading(true);
		setError("");
		try {
			await habitService.createHabit({
				name: habitName.trim(),
				category: category.trim(),
				targetPerWeek,
				userId,
			});
			setHabitName("");
			setTargetPerWeek(3);
			onClose();
		} catch (error) {
			console.error("Error creating habit:", error);
			setError("Failed to create habit. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="habit-manager-overlay">
			<div className="habit-manager-modal">
				<div className="modal-header">
					<h2>Add New Habit</h2>
					<button className="close-btn" onClick={onClose}>
						x
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					{error && <div className="error-message">{error}</div>}
					<div className="form-group">
						<label htmlFor="habitName">Habit Name</label>
						<input
							id="habitName"
							type="text"
							value={habitName}
							onChange={(e) => setHabitName(e.target.value)}
							placeholder="e.g., Morning Meditation"
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="category">Category</label>
						<input
							id="category"
							type="text"
							list="manager-category-options"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							placeholder="e.g., Mobility"
						/>
						<datalist id="manager-category-options">
							{existingCategories.map((cat) => (
								<option key={cat} value={cat} />
							))}
						</datalist>
						<div className="category-preview">
							<span
								className="category-dot"
								style={{ background: categoryInfo.color }}
							/>
							<span>{category || "No category"}</span>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="target">Target per Week</label>
						<input
							id="target"
							type="number"
							min="1"
							max="7"
							value={targetPerWeek}
							onChange={(e) =>
								setTargetPerWeek(
									Math.max(1, Math.min(7, parseInt(e.target.value) || 1)),
								)
							}
							required
						/>
					</div>

					<div className="form-actions">
						<button type="button" className="btn-cancel" onClick={onClose}>
							Cancel
						</button>
						<button type="submit" className="btn-submit" disabled={loading}>
							{loading ? "Adding..." : "Add Habit"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

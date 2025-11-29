import type React from "react";
import { useState } from "react";
import { HabitService } from "../services/habitService";
import { buildCategoryInfo } from "../utils/categoryUtils";
import "./HabitManager.css";

const habitService = new HabitService();

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
	const [habitName, setHabitName] = useState("");
	const [category, setCategory] = useState("Mobility");
	const [targetPerWeek, setTargetPerWeek] = useState(3);
	const [loading, setLoading] = useState(false);

	const categoryInfo = buildCategoryInfo(category);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!habitName.trim()) return;
		if (!category.trim()) return;

		setLoading(true);
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
							onChange={(e) => setTargetPerWeek(parseInt(e.target.value))}
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

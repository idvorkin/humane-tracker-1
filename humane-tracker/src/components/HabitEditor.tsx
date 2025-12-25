import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useHabitService } from "../hooks/useHabitService";
import type { Habit } from "../types/habit";
import { buildCategoryInfo } from "../utils/categoryUtils";
import { validateHabitForm } from "../utils/habitValidation";
import "./HabitSettings.css";

interface HabitEditorProps {
	habit: Habit;
	onClose: () => void;
	onUpdate: () => void;
	userId: string;
	existingCategories: string[];
}

const TRACKING_TYPES = [
	{
		value: "binary",
		label: "Binary (Yes/No)",
		description: "Either done or not done",
	},
	{
		value: "sets",
		label: "Sets (1-5)",
		description: "Count multiple completions",
	},
	{ value: "hybrid", label: "Hybrid", description: "Flexible tracking" },
];

export const HabitEditor: React.FC<HabitEditorProps> = ({
	habit,
	onClose,
	onUpdate,
	userId,
	existingCategories,
}) => {
	const [name, setName] = useState(habit.name);
	const [category, setCategory] = useState(habit.category);
	const [targetPerWeek, setTargetPerWeek] = useState(habit.targetPerWeek);
	const [trackingType, setTrackingType] = useState(
		habit.trackingType || "hybrid",
	);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const habitService = useHabitService();

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (deleteTimerRef.current) {
				clearTimeout(deleteTimerRef.current);
			}
		};
	}, []);
	const categoryInfo = buildCategoryInfo(category);

	const handleSave = async () => {
		const validation = validateHabitForm({ name, category });
		if (!validation.isValid) {
			setError(validation.errors.name || validation.errors.category || "");
			return;
		}

		setIsSaving(true);
		setError("");

		try {
			await habitService.updateHabit(habit.id, {
				name: name.trim(),
				category: category.trim(),
				targetPerWeek,
				trackingType,
			});
			onUpdate();
			onClose();
		} catch (err) {
			console.error("Error updating habit:", err);
			setError("Failed to update habit. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!isDeleting) {
			setIsDeleting(true);
			deleteTimerRef.current = setTimeout(() => setIsDeleting(false), 3000); // Reset after 3 seconds
			return;
		}

		try {
			// Delete all entries for this habit first
			const entries = await habitService.getEntriesForHabit(habit.id);
			for (const entry of entries) {
				await habitService.deleteEntry(entry.id);
			}

			// Then delete the habit
			await habitService.deleteHabit(habit.id);
			onUpdate();
			onClose();
		} catch (err) {
			console.error("Error deleting habit:", err);
			setError("Failed to delete habit. Please try again.");
			setIsDeleting(false);
		}
	};

	return (
		<div className="habit-editor-overlay">
			<div className="habit-editor-modal">
				<div className="modal-header">
					<h2>Edit Habit</h2>
					<button className="close-btn" onClick={onClose}>
						✕
					</button>
				</div>

				<div className="modal-body">
					{error && <div className="error-message">{error}</div>}

					<div className="form-group">
						<label htmlFor="habitName">Habit Name</label>
						<input
							id="habitName"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Morning Meditation"
							maxLength={50}
						/>
						<span className="char-count">{name.length}/50</span>
					</div>

					<div className="form-group">
						<label htmlFor="category">Category</label>
						<input
							id="category"
							type="text"
							list="category-options"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							placeholder="e.g., Mobility"
							maxLength={50}
						/>
						<datalist id="category-options">
							{existingCategories.map((cat) => (
								<option key={cat} value={cat} />
							))}
						</datalist>
						<div className="category-preview">
							<span
								className="category-dot"
								style={{
									background: categoryInfo.color,
								}}
							/>
							<span>{category || "No category"}</span>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="trackingType">Tracking Type</label>
						<div className="tracking-type-options">
							{TRACKING_TYPES.map((type) => (
								<label key={type.value} className="tracking-type-option">
									<input
										type="radio"
										name="trackingType"
										value={type.value}
										checked={trackingType === type.value}
										onChange={(e) =>
											setTrackingType(
												e.target.value as "binary" | "sets" | "hybrid",
											)
										}
									/>
									<div className="tracking-type-info">
										<strong>{type.label}</strong>
										<small>{type.description}</small>
									</div>
								</label>
							))}
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="target">Target Days per Week</label>
						<input
							id="target"
							type="number"
							value={targetPerWeek}
							onChange={(e) =>
								setTargetPerWeek(
									Math.max(1, Math.min(7, parseInt(e.target.value) || 1)),
								)
							}
							min="1"
							max="7"
						/>
						<small>
							How many days per week do you want to complete this habit?
						</small>
					</div>

					<div className="danger-zone">
						<h3>Danger Zone</h3>
						<button
							className={`btn-delete ${isDeleting ? "confirming" : ""}`}
							onClick={handleDelete}
						>
							{isDeleting ? "Click again to confirm deletion" : "Delete Habit"}
						</button>
						{isDeleting && (
							<small className="delete-warning">
								This will permanently delete the habit and all its history. This
								cannot be undone.
							</small>
						)}
					</div>
				</div>

				<div className="modal-footer">
					<button className="btn-cancel" onClick={onClose}>
						Cancel
					</button>
					<button
						className="btn-save"
						onClick={handleSave}
						disabled={isSaving || !name.trim()}
					>
						{isSaving ? "Saving..." : "Save Changes"}
					</button>
				</div>
			</div>
		</div>
	);
};

import type React from "react";
import { useState } from "react";
import { DEFAULT_HABITS } from "../data/defaultHabits";
import { useHabitService } from "../hooks/useHabitService";
import { buildCategoryInfo, extractCategories } from "../utils/categoryUtils";
import "./InitializeHabits.css";

interface InitializeHabitsProps {
	userId: string;
	onComplete: () => void;
}

export const InitializeHabits: React.FC<InitializeHabitsProps> = ({
	userId,
	onComplete,
}) => {
	const habitService = useHabitService();
	const [loading, setLoading] = useState(false);
	const [progress, setProgress] = useState(0);

	// Derive categories from default habits dynamically
	const categories = extractCategories(DEFAULT_HABITS);

	const initializeDefaultHabits = async () => {
		setLoading(true);
		setProgress(0);

		try {
			// Delete all existing habits first (wipe and replace)
			const existingHabits = await habitService.getUserHabits(userId);
			if (existingHabits.length > 0) {
				await habitService.bulkDeleteHabits(existingHabits.map((h) => h.id));
			}

			const habitsToAdd = DEFAULT_HABITS;
			const total = habitsToAdd.length;

			// First pass: create all raw habits (children must exist before tags)
			const rawHabits = habitsToAdd.filter((h) => h.habitType !== "tag");
			const tagHabits = habitsToAdd.filter((h) => h.habitType === "tag");

			// Map from name to created ID
			const nameToId = new Map<string, string>();

			// Create raw habits first
			for (let i = 0; i < rawHabits.length; i++) {
				const habit = rawHabits[i];
				const id = await habitService.createHabit({
					name: habit.name,
					category: habit.category,
					targetPerWeek: habit.targetPerWeek,
					userId,
					habitType: "raw",
				});
				nameToId.set(habit.name, id);
				setProgress(Math.round(((i + 1) / total) * 100));
			}

			// Second pass: create tags with child references
			for (let i = 0; i < tagHabits.length; i++) {
				const habit = tagHabits[i];
				// Resolve child names to IDs, warning on missing children
				const childIds: string[] = [];
				for (const childName of habit.childNames ?? []) {
					const childId = nameToId.get(childName);
					if (childId) {
						childIds.push(childId);
					} else {
						console.warn(
							`[InitializeHabits] Child habit "${childName}" not found for tag "${habit.name}". ` +
								`Check defaultHabits.ts for typos.`,
						);
					}
				}

				const tagId = await habitService.createHabit({
					name: habit.name,
					category: habit.category,
					targetPerWeek: habit.targetPerWeek,
					userId,
					habitType: "tag",
					childIds,
				});

				// Update children to have parentIds pointing to this tag
				for (const childId of childIds) {
					await habitService.updateHabit(childId, {
						parentIds: [tagId],
					});
				}

				setProgress(Math.round(((rawHabits.length + i + 1) / total) * 100));
			}

			onComplete();
		} catch (error) {
			console.error("Error initializing habits:", error);
			alert("Failed to initialize habits. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="initialize-habits">
			<div className="init-card">
				<h2>Welcome to Humane Tracker!</h2>
				<p>Would you like to start with the default habit set?</p>
				<p className="habit-count">
					{DEFAULT_HABITS.length} habits across {categories.length} categories
				</p>

				<div className="categories-preview">
					{categories.map((category) => {
						const info = buildCategoryInfo(category);
						const count = DEFAULT_HABITS.filter(
							(h) => h.category === category,
						).length;
						return (
							<div key={category} className="category-item">
								<span
									className="category-dot"
									style={{ background: info.color }}
								/>
								{info.name} ({count} habits)
							</div>
						);
					})}
				</div>

				{loading && (
					<div className="progress-bar">
						<div
							className="progress-fill"
							style={{ width: `${progress}%` }}
						></div>
						<span className="progress-text">{progress}%</span>
					</div>
				)}

				<div className="init-actions">
					<button className="btn-skip" onClick={onComplete} disabled={loading}>
						Skip for now
					</button>
					<button
						className="btn-initialize"
						onClick={initializeDefaultHabits}
						disabled={loading}
					>
						{loading ? "Initializing..." : "Initialize Default Habits"}
					</button>
				</div>
			</div>
		</div>
	);
};

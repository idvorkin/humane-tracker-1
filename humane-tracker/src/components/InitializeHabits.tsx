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
			// Get existing habits to avoid duplicates
			const existingHabits = await habitService.getUserHabits(userId);
			const existingNames = new Set(existingHabits.map((h) => h.name));

			// Filter to only habits that don't already exist
			const habitsToAdd = DEFAULT_HABITS.filter(
				(habit) => !existingNames.has(habit.name),
			);

			if (habitsToAdd.length === 0) {
				onComplete();
				return;
			}

			const total = habitsToAdd.length;

			for (let i = 0; i < habitsToAdd.length; i++) {
				const habit = habitsToAdd[i];
				await habitService.createHabit({
					name: habit.name,
					category: habit.category,
					targetPerWeek: habit.targetPerWeek,
					userId,
					variants: habit.variants,
					allowCustomVariant: habit.allowCustomVariant,
				});
				setProgress(Math.round(((i + 1) / total) * 100));
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

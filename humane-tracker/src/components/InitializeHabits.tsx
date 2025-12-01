import {
	Box,
	Button,
	Card,
	Group,
	Modal,
	Progress,
	Stack,
	Text,
} from "@mantine/core";
import type React from "react";
import { useState } from "react";
import { DEFAULT_HABITS } from "../data/defaultHabits";
import { HabitService } from "../services/habitService";
import { buildCategoryInfo, extractCategories } from "../utils/categoryUtils";

const habitService = new HabitService();

interface InitializeHabitsProps {
	userId: string;
	onComplete: () => void;
}

export const InitializeHabits: React.FC<InitializeHabitsProps> = ({
	userId,
	onComplete,
}) => {
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
		<Modal
			opened
			onClose={onComplete}
			title="Welcome to Humane Tracker!"
			size="md"
			centered
			styles={{
				title: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 },
			}}
		>
			<Stack gap="lg">
				<Text>Would you like to start with the default habit set?</Text>

				<Text size="sm" c="dimmed">
					{DEFAULT_HABITS.length} habits across {categories.length} categories
				</Text>

				<Card withBorder radius="md" p="sm">
					<Stack gap="xs">
						{categories.map((category) => {
							const info = buildCategoryInfo(category);
							const count = DEFAULT_HABITS.filter(
								(h) => h.category === category,
							).length;
							return (
								<Group key={category} gap="sm">
									<Box
										w={8}
										h={8}
										style={{ background: info.color, borderRadius: "50%" }}
									/>
									<Text size="sm">
										{info.name} ({count} habits)
									</Text>
								</Group>
							);
						})}
					</Stack>
				</Card>

				{loading && (
					<Stack gap="xs">
						<Progress value={progress} color="warmAmber" animated />
						<Text size="sm" c="dimmed" ta="center">
							{progress}%
						</Text>
					</Stack>
				)}

				<Group justify="flex-end">
					<Button variant="subtle" onClick={onComplete} disabled={loading}>
						Skip for now
					</Button>
					<Button
						color="warmAmber"
						onClick={initializeDefaultHabits}
						disabled={loading}
						loading={loading}
					>
						Initialize Default Habits
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
};

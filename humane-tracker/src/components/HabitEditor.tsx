import {
	Alert,
	Autocomplete,
	Button,
	Group,
	Loader,
	Modal,
	NumberInput,
	Radio,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { HabitService } from "../services/habitService";
import type { Habit } from "../types/habit";
import { buildCategoryInfo } from "../utils/categoryUtils";

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

	const habitService = new HabitService();
	const categoryInfo = buildCategoryInfo(category);

	const handleSave = async () => {
		if (!name.trim()) {
			setError("Habit name is required");
			return;
		}

		if (!category.trim()) {
			setError("Category is required");
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
				updatedAt: new Date(),
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
			setTimeout(() => setIsDeleting(false), 3000); // Reset after 3 seconds
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
		<Modal
			opened={true}
			onClose={onClose}
			title={
				<Group gap="xs">
					<IconPencil size={20} />
					<span>Edit Habit</span>
				</Group>
			}
			centered
			size="md"
		>
			<Stack gap="md">
				{error && (
					<Alert color="red" title="Error">
						{error}
					</Alert>
				)}

				<TextInput
					label="Habit Name"
					placeholder="e.g., Morning Meditation"
					value={name}
					onChange={(e) => setName(e.currentTarget.value)}
					maxLength={50}
					description={`${name.length}/50 characters`}
					required
				/>

				<div>
					<Autocomplete
						label="Category"
						placeholder="e.g., Mobility"
						value={category}
						onChange={setCategory}
						data={existingCategories}
						maxLength={50}
						required
					/>
					<Group gap="xs" mt="xs">
						<div
							style={{
								width: "12px",
								height: "12px",
								borderRadius: "50%",
								background: categoryInfo.color,
							}}
						/>
						<Text size="sm" c="dimmed">
							{category || "No category"}
						</Text>
					</Group>
				</div>

				<Radio.Group
					label="Tracking Type"
					value={trackingType}
					onChange={setTrackingType}
				>
					<Stack gap="xs" mt="xs">
						{TRACKING_TYPES.map((type) => (
							<Radio
								key={type.value}
								value={type.value}
								label={
									<div>
										<Text size="sm" fw={500}>
											{type.label}
										</Text>
										<Text size="xs" c="dimmed">
											{type.description}
										</Text>
									</div>
								}
							/>
						))}
					</Stack>
				</Radio.Group>

				<NumberInput
					label="Target Days per Week"
					value={targetPerWeek}
					onChange={(value) =>
						setTargetPerWeek(Math.max(1, Math.min(7, Number(value) || 1)))
					}
					min={1}
					max={7}
					description="How many days per week do you want to complete this habit?"
					required
				/>

				<div
					style={{
						borderTop: "1px solid #e0e0e0",
						paddingTop: "16px",
						marginTop: "8px",
					}}
				>
					<Text size="sm" fw={600} c="red" mb="xs">
						Danger Zone
					</Text>
					<Button
						color="red"
						variant={isDeleting ? "filled" : "light"}
						onClick={handleDelete}
						fullWidth
					>
						{isDeleting ? "Click again to confirm deletion" : "Delete Habit"}
					</Button>
					{isDeleting && (
						<Text size="xs" c="dimmed" mt="xs">
							This will permanently delete the habit and all its history. This
							cannot be undone.
						</Text>
					)}
				</div>

				<Group justify="flex-end" gap="sm" mt="md">
					<Button variant="default" onClick={onClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={isSaving || !name.trim()}
						leftSection={isSaving ? <Loader size="xs" /> : null}
					>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
};

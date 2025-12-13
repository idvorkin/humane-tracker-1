import type React from "react";
import { useState } from "react";
import { useHabitService } from "../hooks/useHabitService";
import type { Habit } from "../types/habit";

interface CleanupDuplicatesProps {
	userId: string;
	onComplete: () => void;
}

export const CleanupDuplicates: React.FC<CleanupDuplicatesProps> = ({
	userId,
	onComplete,
}) => {
	const habitService = useHabitService();
	const [isProcessing, setIsProcessing] = useState(false);
	const [status, setStatus] = useState<string>("");
	const [duplicatesFound, setDuplicatesFound] = useState<string[]>([]);

	const handleCleanup = async () => {
		setIsProcessing(true);
		setStatus("Scanning for duplicate habits...");

		try {
			// Fetch all habits
			const allHabits = await habitService.getUserHabits(userId);

			// Group habits by name
			const habitsByName = allHabits.reduce(
				(acc, habit) => {
					if (!acc[habit.name]) {
						acc[habit.name] = [];
					}
					acc[habit.name].push(habit);
					return acc;
				},
				{} as Record<string, Habit[]>,
			);

			// Find duplicates and collect IDs to delete
			const duplicateNames: string[] = [];
			const idsToDelete: string[] = [];

			for (const [name, habits] of Object.entries(habitsByName)) {
				if (habits.length > 1) {
					duplicateNames.push(`${name} (${habits.length} copies)`);

					// Sort by creation date, keep the oldest one
					habits.sort((a, b) => {
						const dateA =
							a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
						const dateB =
							b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
						return dateA - dateB;
					});

					// Collect IDs of all duplicates (all but the oldest)
					for (let i = 1; i < habits.length; i++) {
						idsToDelete.push(habits[i].id);
					}
				}
			}

			// Delete all duplicates atomically in a single transaction
			// This prevents race conditions and ensures all-or-nothing behavior
			if (idsToDelete.length > 0) {
				setStatus(`Removing ${idsToDelete.length} duplicate habits...`);
				await habitService.bulkDeleteHabits(idsToDelete);
			}

			const deletedCount = idsToDelete.length;

			if (duplicateNames.length > 0) {
				setDuplicatesFound(duplicateNames);
				setStatus(
					`Cleanup complete! Removed ${deletedCount} duplicate habits.`,
				);
			} else {
				setStatus("No duplicates found!");
			}

			// Wait a moment then close
			setTimeout(() => {
				onComplete();
			}, 3000);
		} catch (error) {
			console.error("Error during cleanup:", error);
			setStatus("Error during cleanup. Check console for details.");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(0, 0, 0, 0.8)",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				zIndex: 1000,
			}}
		>
			<div
				style={{
					background: "#242424",
					padding: "30px",
					borderRadius: "8px",
					border: "1px solid #333",
					maxWidth: "500px",
					width: "90%",
				}}
			>
				<h2 style={{ color: "#60a5fa", marginBottom: "20px" }}>
					Clean Up Duplicate Habits
				</h2>

				<p style={{ color: "#94a3b8", marginBottom: "20px" }}>
					This will scan for habits with the same name and remove duplicates,
					keeping only the oldest one with its entries intact.
				</p>

				{duplicatesFound.length > 0 && (
					<div
						style={{
							background: "#1a1a1a",
							padding: "10px",
							borderRadius: "4px",
							marginBottom: "20px",
							maxHeight: "150px",
							overflowY: "auto",
						}}
					>
						<div
							style={{
								color: "#fbbf24",
								fontSize: "12px",
								marginBottom: "5px",
							}}
						>
							Duplicates found:
						</div>
						{duplicatesFound.map((dup, idx) => (
							<div key={idx} style={{ color: "#64748b", fontSize: "12px" }}>
								• {dup}
							</div>
						))}
					</div>
				)}

				{status && (
					<div
						style={{
							color: status.includes("complete") ? "#22c55e" : "#94a3b8",
							marginBottom: "20px",
							fontSize: "14px",
						}}
					>
						{status}
					</div>
				)}

				<div
					style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
				>
					<button
						onClick={onComplete}
						disabled={isProcessing}
						style={{
							padding: "8px 20px",
							background: "#2a2a2a",
							color: "#94a3b8",
							border: "1px solid #333",
							borderRadius: "6px",
							cursor: isProcessing ? "not-allowed" : "pointer",
							opacity: isProcessing ? 0.5 : 1,
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleCleanup}
						disabled={isProcessing}
						style={{
							padding: "8px 20px",
							background: "#ef4444",
							color: "#fff",
							border: "none",
							borderRadius: "6px",
							cursor: isProcessing ? "not-allowed" : "pointer",
							opacity: isProcessing ? 0.5 : 1,
						}}
					>
						{isProcessing ? "Processing..." : "Clean Up Duplicates"}
					</button>
				</div>
			</div>
		</div>
	);
};

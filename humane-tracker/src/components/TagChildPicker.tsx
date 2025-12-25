import type React from "react";
import { useEffect, useRef } from "react";
import { toDateString } from "../repositories";
import type { HabitWithStatus } from "../types/habit";
import "./TagChildPicker.css";

interface TagChildPickerProps {
	tag: HabitWithStatus;
	childHabits: HabitWithStatus[];
	date: Date;
	position: { x: number; y: number };
	onSelectChild: (childId: string | null) => void;
	onClose: () => void;
}

export const TagChildPicker: React.FC<TagChildPickerProps> = ({
	tag,
	childHabits,
	date,
	position,
	onSelectChild,
	onClose,
}) => {
	const pickerRef = useRef<HTMLDivElement>(null);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				pickerRef.current &&
				!pickerRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	// Calculate position to avoid going off screen
	const adjustedPosition = {
		left: Math.min(position.x, window.innerWidth - 220),
		top: Math.min(position.y, window.innerHeight - 200),
	};

	// Check if a habit has an entry for the selected date
	const hasEntryForDate = (habit: HabitWithStatus, skipSynthetic = false) => {
		const dateStr = toDateString(date);
		const entries = habit.entries || [];
		return entries.some(
			(e) =>
				toDateString(e.date) === dateStr &&
				e.value >= 1 &&
				(!skipSynthetic || !e.id.startsWith("synthetic-")),
		);
	};

	const tagHasRealEntry = hasEntryForDate(tag, true);

	return (
		<div className="tag-child-picker-overlay">
			<div
				ref={pickerRef}
				className="tag-child-picker"
				style={{
					left: adjustedPosition.left,
					top: adjustedPosition.top,
				}}
			>
				<div className="tag-child-picker-header">
					<span className="tag-child-picker-title">{tag.name}</span>
					<button
						className="tag-child-picker-close"
						onClick={onClose}
						type="button"
						aria-label="Close"
					>
						×
					</button>
				</div>
				<div className="tag-child-picker-options">
					{childHabits.map((child) => {
						const hasEntry = hasEntryForDate(child);
						return (
							<button
								key={child.id}
								className={`child-option ${hasEntry ? "child-option-done" : ""}`}
								onClick={() => onSelectChild(child.id)}
								type="button"
							>
								{hasEntry && <span className="child-check">✓</span>}
								{child.name}
							</button>
						);
					})}
					<button
						className={`child-option child-option-generic ${tagHasRealEntry ? "child-option-done" : ""}`}
						onClick={() => onSelectChild(null)}
						type="button"
					>
						{tagHasRealEntry && <span className="child-check">✓</span>}
						Just did it (unspecified)
					</button>
				</div>
			</div>
		</div>
	);
};

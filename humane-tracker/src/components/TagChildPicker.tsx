import type React from "react";
import { useEffect, useRef } from "react";
import type { Habit, HabitWithStatus } from "../types/habit";
import "./TagChildPicker.css";

interface TagChildPickerProps {
	tag: HabitWithStatus;
	childHabits: Habit[];
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
					>
						×
					</button>
				</div>
				<div className="tag-child-picker-options">
					{childHabits.map((child) => (
						<button
							key={child.id}
							className="child-option"
							onClick={() => onSelectChild(child.id)}
							type="button"
						>
							{child.name}
						</button>
					))}
					<button
						className="child-option child-option-generic"
						onClick={() => onSelectChild(null)}
						type="button"
					>
						Just did it (unspecified)
					</button>
				</div>
			</div>
		</div>
	);
};

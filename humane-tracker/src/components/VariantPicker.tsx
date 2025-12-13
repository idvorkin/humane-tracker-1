import type React from "react";
import { useEffect, useRef } from "react";
import type { HabitVariant, HabitWithStatus } from "../types/habit";
import "./VariantPicker.css";

interface VariantPickerProps {
	habit: HabitWithStatus;
	date: Date;
	position: { x: number; y: number };
	onSelect: (variant: HabitVariant | null) => void;
	onClose: () => void;
}

export const VariantPicker: React.FC<VariantPickerProps> = ({
	habit,
	date,
	position,
	onSelect,
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

	// Sort variants by usage count (most used first)
	const sortedVariants = [...(habit.variants || [])].sort(
		(a, b) => (b.usageCount || 0) - (a.usageCount || 0),
	);

	// Calculate position to avoid going off screen
	const adjustedPosition = {
		left: Math.min(position.x, window.innerWidth - 220),
		top: Math.min(position.y, window.innerHeight - 200),
	};

	return (
		<div className="variant-picker-overlay">
			<div
				ref={pickerRef}
				className="variant-picker"
				style={{
					left: adjustedPosition.left,
					top: adjustedPosition.top,
				}}
			>
				<div className="variant-picker-header">
					<span className="variant-picker-title">{habit.name}</span>
					<button
						className="variant-picker-close"
						onClick={onClose}
						type="button"
					>
						×
					</button>
				</div>
				<div className="variant-picker-options">
					{sortedVariants.map((variant) => (
						<button
							key={variant.id}
							className="variant-option"
							onClick={() => onSelect(variant)}
							type="button"
						>
							{variant.name}
						</button>
					))}
					<button
						className="variant-option variant-option-generic"
						onClick={() => onSelect(null)}
						type="button"
					>
						Just did it ✓
					</button>
				</div>
			</div>
		</div>
	);
};

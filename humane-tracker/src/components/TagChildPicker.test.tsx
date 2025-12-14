import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HabitWithStatus } from "../types/habit";
import { TagChildPicker } from "./TagChildPicker";

// Helper to create a mock tag
function createMockTag(
	overrides: Partial<HabitWithStatus> = {},
): HabitWithStatus {
	return {
		id: "tag-1",
		name: "Shoulder Accessory",
		category: "Mobility",
		targetPerWeek: 3,
		userId: "user-1",
		createdAt: new Date(),
		updatedAt: new Date(),
		status: "today",
		currentWeekCount: 0,
		entries: [],
		habitType: "tag",
		childIds: ["child-1", "child-2", "child-3"],
		...overrides,
	};
}

// Helper to create mock child habits with status
function createMockChildHabits(): HabitWithStatus[] {
	return [
		{
			id: "child-1",
			name: "Shoulder Y",
			category: "Mobility",
			targetPerWeek: 2,
			userId: "user-1",
			createdAt: new Date(),
			updatedAt: new Date(),
			habitType: "raw",
			parentIds: ["tag-1"],
			status: "pending",
			currentWeekCount: 0,
			entries: [],
		},
		{
			id: "child-2",
			name: "Wall Slide",
			category: "Mobility",
			targetPerWeek: 2,
			userId: "user-1",
			createdAt: new Date(),
			updatedAt: new Date(),
			habitType: "raw",
			parentIds: ["tag-1"],
			status: "pending",
			currentWeekCount: 0,
			entries: [],
		},
		{
			id: "child-3",
			name: "Swimmers",
			category: "Mobility",
			targetPerWeek: 2,
			userId: "user-1",
			createdAt: new Date(),
			updatedAt: new Date(),
			habitType: "raw",
			parentIds: ["tag-1"],
			status: "pending",
			currentWeekCount: 0,
			entries: [],
		},
	];
}

describe("TagChildPicker", () => {
	const defaultProps = {
		tag: createMockTag(),
		childHabits: createMockChildHabits(),
		date: new Date(),
		position: { x: 100, y: 100 },
		onSelectChild: vi.fn(),
		onClose: vi.fn(),
	};

	it("renders the tag name in header", () => {
		render(<TagChildPicker {...defaultProps} />);

		expect(screen.getByText("Shoulder Accessory")).toBeInTheDocument();
	});

	it("renders all child habit options", () => {
		render(<TagChildPicker {...defaultProps} />);

		expect(screen.getByText("Shoulder Y")).toBeInTheDocument();
		expect(screen.getByText("Wall Slide")).toBeInTheDocument();
		expect(screen.getByText("Swimmers")).toBeInTheDocument();
	});

	it("renders the generic option", () => {
		render(<TagChildPicker {...defaultProps} />);

		expect(screen.getByText("Just did it (unspecified)")).toBeInTheDocument();
	});

	it("calls onSelectChild with child id when child is clicked", () => {
		const onSelectChild = vi.fn();
		render(<TagChildPicker {...defaultProps} onSelectChild={onSelectChild} />);

		fireEvent.click(screen.getByText("Shoulder Y"));

		expect(onSelectChild).toHaveBeenCalledWith("child-1");
	});

	it("calls onSelectChild with null when generic option is clicked", () => {
		const onSelectChild = vi.fn();
		render(<TagChildPicker {...defaultProps} onSelectChild={onSelectChild} />);

		fireEvent.click(screen.getByText("Just did it (unspecified)"));

		expect(onSelectChild).toHaveBeenCalledWith(null);
	});

	it("calls onClose when close button is clicked", () => {
		const onClose = vi.fn();
		render(<TagChildPicker {...defaultProps} onClose={onClose} />);

		fireEvent.click(screen.getByText("×"));

		expect(onClose).toHaveBeenCalled();
	});

	it("calls onClose when Escape key is pressed", () => {
		const onClose = vi.fn();
		render(<TagChildPicker {...defaultProps} onClose={onClose} />);

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onClose).toHaveBeenCalled();
	});

	it("calls onClose when clicking outside the picker", () => {
		const onClose = vi.fn();
		render(
			<div>
				<div data-testid="outside">Outside</div>
				<TagChildPicker {...defaultProps} onClose={onClose} />
			</div>,
		);

		fireEvent.mouseDown(screen.getByTestId("outside"));

		expect(onClose).toHaveBeenCalled();
	});

	it("renders with empty child habits", () => {
		render(<TagChildPicker {...defaultProps} childHabits={[]} />);

		// Should still show the generic option
		expect(screen.getByText("Just did it (unspecified)")).toBeInTheDocument();
		// Should not show any child options
		expect(screen.queryByText("Shoulder Y")).not.toBeInTheDocument();
	});
});

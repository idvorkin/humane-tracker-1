import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TallyMarks } from "./TallyMarks";

describe("TallyMarks", () => {
	describe("empty state", () => {
		it("renders empty placeholder when count is 0", () => {
			render(<TallyMarks count={0} />);
			expect(screen.getByText("○")).toBeInTheDocument();
		});

		it("renders empty placeholder when count is negative", () => {
			render(<TallyMarks count={-1} />);
			expect(screen.getByText("○")).toBeInTheDocument();
		});
	});

	describe("mark rendering", () => {
		it("renders single vertical mark for count of 1", () => {
			const { container } = render(<TallyMarks count={1} />);
			const marks = container.querySelectorAll(".tally-mark-line");
			const strikes = container.querySelectorAll(".tally-strike-line");
			expect(marks).toHaveLength(1);
			expect(strikes).toHaveLength(0);
		});

		it("renders 4 vertical marks without strike for count of 4", () => {
			const { container } = render(<TallyMarks count={4} />);
			const marks = container.querySelectorAll(".tally-mark-line");
			const strikes = container.querySelectorAll(".tally-strike-line");
			expect(marks).toHaveLength(4);
			expect(strikes).toHaveLength(0);
		});

		it("renders 4 vertical marks WITH diagonal strike for count of 5", () => {
			const { container } = render(<TallyMarks count={5} />);
			const marks = container.querySelectorAll(".tally-mark-line");
			const strikes = container.querySelectorAll(".tally-strike-line");
			expect(marks).toHaveLength(4);
			expect(strikes).toHaveLength(1);
		});

		it("renders two groups for count of 6", () => {
			const { container } = render(<TallyMarks count={6} />);
			const groups = container.querySelectorAll(".tally-group-svg");
			const marks = container.querySelectorAll(".tally-mark-line");
			const strikes = container.querySelectorAll(".tally-strike-line");
			expect(groups).toHaveLength(2);
			// First group: 4 marks + 1 strike, Second group: 1 mark
			expect(marks).toHaveLength(5);
			expect(strikes).toHaveLength(1);
		});

		it("renders correct marks for count of 10", () => {
			const { container } = render(<TallyMarks count={10} />);
			const groups = container.querySelectorAll(".tally-group-svg");
			const marks = container.querySelectorAll(".tally-mark-line");
			const strikes = container.querySelectorAll(".tally-strike-line");
			expect(groups).toHaveLength(2);
			// Two complete groups: 4+4 marks, 2 strikes
			expect(marks).toHaveLength(8);
			expect(strikes).toHaveLength(2);
		});
	});

	describe("overflow handling", () => {
		it("respects maxVisible and shows overflow text", () => {
			render(<TallyMarks count={15} maxVisible={10} />);
			expect(screen.getByText("+5")).toBeInTheDocument();
		});

		it("shows +10 overflow when count is 20 and maxVisible is 10", () => {
			render(<TallyMarks count={20} maxVisible={10} />);
			expect(screen.getByText("+10")).toBeInTheDocument();
		});

		it("does not show overflow when count equals maxVisible", () => {
			const { container } = render(<TallyMarks count={10} maxVisible={10} />);
			expect(
				container.querySelector(".tally-overflow"),
			).not.toBeInTheDocument();
		});

		it("uses default maxVisible of 10", () => {
			render(<TallyMarks count={12} />);
			expect(screen.getByText("+2")).toBeInTheDocument();
		});
	});
});

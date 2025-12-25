import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { AffirmationCard } from "./AffirmationCard";

// Mock the repository
vi.mock("../repositories/affirmationLogRepository", () => ({
	affirmationLogRepository: {
		create: vi.fn().mockResolvedValue("test-id"),
	},
}));

describe("AffirmationCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an affirmation title and subtitle", () => {
		render(<AffirmationCard userId="test-user" />);

		// Should render one of the affirmations from the shared constant
		const possibleTitles = DEFAULT_AFFIRMATIONS.map((a) => a.title);

		// At least one title should be visible
		const foundTitle = possibleTitles.some((title) =>
			screen.queryByText(title),
		);
		expect(foundTitle).toBe(true);
	});

	it("shows Opportunity and Did It buttons by default", () => {
		render(<AffirmationCard userId="test-user" />);

		expect(screen.getByText(/Opportunity/)).toBeInTheDocument();
		expect(screen.getByText(/Did it/)).toBeInTheDocument();
	});

	it("shows textarea when Opportunity is clicked", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opportunity/));

		expect(
			screen.getByPlaceholderText("How will you apply this today?"),
		).toBeInTheDocument();
		expect(screen.getByText("Save")).toBeInTheDocument();
	});

	it("shows textarea when Did It is clicked", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Did it/));

		expect(
			screen.getByPlaceholderText("How did you apply this?"),
		).toBeInTheDocument();
	});

	it("closes textarea on cancel button click", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opportunity/));
		expect(
			screen.getByPlaceholderText("How will you apply this today?"),
		).toBeInTheDocument();

		fireEvent.click(screen.getByText("✕"));

		expect(
			screen.queryByPlaceholderText("How will you apply this today?"),
		).not.toBeInTheDocument();
		expect(screen.getByText(/Opportunity/)).toBeInTheDocument();
	});

	it("closes textarea on Escape key", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opportunity/));
		const textarea = screen.getByPlaceholderText(
			"How will you apply this today?",
		);

		fireEvent.keyDown(textarea, { key: "Escape" });

		expect(
			screen.queryByPlaceholderText("How will you apply this today?"),
		).not.toBeInTheDocument();
	});

	it("changes affirmation when refresh button is clicked", () => {
		const { container } = render(<AffirmationCard userId="test-user" />);

		const refreshButton = screen.getByLabelText("Show different affirmation");

		// Get initial title
		const getTitle = () =>
			container.querySelector(".affirmation-card-title")?.textContent;
		const initialTitle = getTitle();

		// Click refresh multiple times - eventually should show a different one
		// (Since there are 4 affirmations and it never repeats, after 3 clicks we must see a change)
		let changed = false;
		for (let i = 0; i < 4; i++) {
			fireEvent.click(refreshButton);
			if (getTitle() !== initialTitle) {
				changed = true;
				break;
			}
		}

		// With 4 options and no-repeat logic, should always change
		expect(changed).toBe(true);
	});

	it("saves note when Save is clicked", async () => {
		const { affirmationLogRepository } = await import(
			"../repositories/affirmationLogRepository"
		);

		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opportunity/));
		const textarea = screen.getByPlaceholderText(
			"How will you apply this today?",
		);
		fireEvent.change(textarea, { target: { value: "Test note" } });
		fireEvent.click(screen.getByText("Save"));

		expect(affirmationLogRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "test-user",
				logType: "opportunity",
				note: "Test note",
			}),
		);
	});

	it("saves note when Enter is pressed", async () => {
		const { affirmationLogRepository } = await import(
			"../repositories/affirmationLogRepository"
		);

		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Did it/));
		const textarea = screen.getByPlaceholderText("How did you apply this?");
		fireEvent.change(textarea, { target: { value: "Applied it!" } });
		fireEvent.keyDown(textarea, { key: "Enter" });

		expect(affirmationLogRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "test-user",
				logType: "didit",
				note: "Applied it!",
			}),
		);
	});

	it("does not save empty notes", async () => {
		const { affirmationLogRepository } = await import(
			"../repositories/affirmationLogRepository"
		);

		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opportunity/));
		fireEvent.click(screen.getByText("Save"));

		expect(affirmationLogRepository.create).not.toHaveBeenCalled();
	});
});

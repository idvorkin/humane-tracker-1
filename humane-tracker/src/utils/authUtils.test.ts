import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getLocalAnonymousDataSummary,
	handleSignIn,
	type LocalDataSummary,
	type SignInChoice,
} from "./authUtils";

// Mock dependencies
vi.mock("../repositories", () => ({
	habitRepository: {
		getByUserId: vi.fn(),
		deleteByUserId: vi.fn(),
	},
	entryRepository: {
		countByUserId: vi.fn(),
		deleteByUserId: vi.fn(),
	},
}));

vi.mock("../config/db", () => ({
	db: {
		cloud: {
			login: vi.fn(),
		},
	},
}));

// Import mocked modules
import { db } from "../config/db";
import { entryRepository, habitRepository } from "../repositories";

describe("getLocalAnonymousDataSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when no anonymous habits exist", async () => {
		vi.mocked(habitRepository.getByUserId).mockResolvedValue([]);

		const result = await getLocalAnonymousDataSummary();

		expect(result).toBeNull();
		expect(habitRepository.getByUserId).toHaveBeenCalledWith("anonymous");
	});

	it("returns summary with habit and entry counts", async () => {
		const mockHabits = [
			{ id: "1", name: "Exercise", category: "health" },
			{ id: "2", name: "Read", category: "learning" },
		];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(10);

		const result = await getLocalAnonymousDataSummary();

		expect(result).toEqual({
			habitCount: 2,
			entryCount: 10,
			habitNames: ["Exercise", "Read"],
		});
		expect(habitRepository.getByUserId).toHaveBeenCalledWith("anonymous");
		expect(entryRepository.countByUserId).toHaveBeenCalledWith("anonymous");
	});

	it("limits habitNames to first 5 habits", async () => {
		const mockHabits = [
			{ id: "1", name: "Habit1" },
			{ id: "2", name: "Habit2" },
			{ id: "3", name: "Habit3" },
			{ id: "4", name: "Habit4" },
			{ id: "5", name: "Habit5" },
			{ id: "6", name: "Habit6" },
			{ id: "7", name: "Habit7" },
		];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(20);

		const result = await getLocalAnonymousDataSummary();

		expect(result?.habitNames).toHaveLength(5);
		expect(result?.habitNames).toEqual([
			"Habit1",
			"Habit2",
			"Habit3",
			"Habit4",
			"Habit5",
		]);
		expect(result?.habitCount).toBe(7); // Total count is still 7
	});

	it("returns null and logs error when repository throws", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		vi.mocked(habitRepository.getByUserId).mockRejectedValue(
			new Error("Database error"),
		);

		const result = await getLocalAnonymousDataSummary();

		expect(result).toBeNull();
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Error checking for local data:",
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
	});
});

describe("handleSignIn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("logs in directly when no local anonymous data exists", async () => {
		vi.mocked(habitRepository.getByUserId).mockResolvedValue([]);
		vi.mocked(db.cloud.login).mockResolvedValue(undefined);

		const result = await handleSignIn();

		expect(result).toEqual({ success: true });
		expect(db.cloud.login).toHaveBeenCalled();
	});

	it("logs in directly when no prompt callback provided", async () => {
		const mockHabits = [{ id: "1", name: "Exercise" }];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(5);
		vi.mocked(db.cloud.login).mockResolvedValue(undefined);

		const result = await handleSignIn();

		expect(result).toEqual({ success: true });
		expect(db.cloud.login).toHaveBeenCalled();
		// Should not clear data since no prompt was shown
		expect(habitRepository.deleteByUserId).not.toHaveBeenCalled();
		expect(entryRepository.deleteByUserId).not.toHaveBeenCalled();
	});

	it("returns success without login when user cancels", async () => {
		const mockHabits = [{ id: "1", name: "Exercise" }];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(5);

		const promptCallback = vi.fn().mockResolvedValue("cancel" as SignInChoice);

		const result = await handleSignIn(promptCallback);

		expect(result).toEqual({ success: true });
		expect(promptCallback).toHaveBeenCalledWith({
			habitCount: 1,
			entryCount: 5,
			habitNames: ["Exercise"],
		});
		expect(db.cloud.login).not.toHaveBeenCalled();
	});

	it("clears anonymous data then logs in when user chooses abandon", async () => {
		const mockHabits = [{ id: "1", name: "Exercise" }];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(5);
		vi.mocked(habitRepository.deleteByUserId).mockResolvedValue(1);
		vi.mocked(entryRepository.deleteByUserId).mockResolvedValue(5);
		vi.mocked(db.cloud.login).mockResolvedValue(undefined);

		const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const promptCallback = vi.fn().mockResolvedValue("abandon" as SignInChoice);

		const result = await handleSignIn(promptCallback);

		expect(result).toEqual({ success: true });
		expect(entryRepository.deleteByUserId).toHaveBeenCalledWith("anonymous");
		expect(habitRepository.deleteByUserId).toHaveBeenCalledWith("anonymous");
		expect(db.cloud.login).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[Auth] Cleared 1 anonymous habits and 5 entries",
		);
		consoleLogSpy.mockRestore();
	});

	it("logs in without clearing data when user chooses merge", async () => {
		const mockHabits = [{ id: "1", name: "Exercise" }];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(5);
		vi.mocked(db.cloud.login).mockResolvedValue(undefined);

		const promptCallback = vi.fn().mockResolvedValue("merge" as SignInChoice);

		const result = await handleSignIn(promptCallback);

		expect(result).toEqual({ success: true });
		expect(promptCallback).toHaveBeenCalled();
		expect(habitRepository.deleteByUserId).not.toHaveBeenCalled();
		expect(entryRepository.deleteByUserId).not.toHaveBeenCalled();
		expect(db.cloud.login).toHaveBeenCalled();
	});

	it("returns error result when login fails", async () => {
		vi.mocked(habitRepository.getByUserId).mockResolvedValue([]);
		vi.mocked(db.cloud.login).mockRejectedValue(new Error("Network error"));

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const result = await handleSignIn();

		expect(result).toEqual({
			success: false,
			error: "Sign-in failed: Network error",
		});
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Error signing in:",
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
	});

	it("handles non-Error exceptions gracefully", async () => {
		vi.mocked(habitRepository.getByUserId).mockResolvedValue([]);
		vi.mocked(db.cloud.login).mockRejectedValue("String error");

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const result = await handleSignIn();

		expect(result).toEqual({
			success: false,
			error: "Sign-in failed: Unknown error occurred",
		});
		consoleErrorSpy.mockRestore();
	});

	it("propagates error when clearing data fails during abandon", async () => {
		const mockHabits = [{ id: "1", name: "Exercise" }];
		vi.mocked(habitRepository.getByUserId).mockResolvedValue(
			mockHabits as ReturnType<
				typeof habitRepository.getByUserId
			> extends Promise<infer T>
				? T
				: never,
		);
		vi.mocked(entryRepository.countByUserId).mockResolvedValue(5);
		vi.mocked(entryRepository.deleteByUserId).mockRejectedValue(
			new Error("Delete failed"),
		);

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const promptCallback = vi.fn().mockResolvedValue("abandon" as SignInChoice);

		const result = await handleSignIn(promptCallback);

		expect(result).toEqual({
			success: false,
			error: "Sign-in failed: Delete failed",
		});
		expect(db.cloud.login).not.toHaveBeenCalled(); // Should not proceed if clearing fails
		consoleErrorSpy.mockRestore();
	});
});

describe("SignInChoice types", () => {
	it("supports all valid choice values", () => {
		const choices: SignInChoice[] = ["merge", "abandon", "cancel"];
		expect(choices).toHaveLength(3);
	});
});

describe("LocalDataSummary interface", () => {
	it("has correct structure", () => {
		const summary: LocalDataSummary = {
			habitCount: 5,
			entryCount: 10,
			habitNames: ["Exercise", "Read"],
		};

		expect(summary.habitCount).toBe(5);
		expect(summary.entryCount).toBe(10);
		expect(summary.habitNames).toEqual(["Exercise", "Read"]);
	});
});

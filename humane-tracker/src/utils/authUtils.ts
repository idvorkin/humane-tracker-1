import { db } from "../config/db";
import { entryRepository, habitRepository } from "../repositories";

export interface LocalDataSummary {
	habitCount: number;
	entryCount: number;
	habitNames: string[];
}

/**
 * Get summary of local anonymous data.
 */
export async function getLocalAnonymousDataSummary(): Promise<LocalDataSummary | null> {
	try {
		const habits = await habitRepository.getByUserId("anonymous");
		if (habits.length === 0) {
			return null;
		}

		const entryCount = await entryRepository.countByUserId("anonymous");

		return {
			habitCount: habits.length,
			entryCount,
			habitNames: habits.map((h) => h.name).slice(0, 5), // First 5 names for preview
		};
	} catch (error) {
		console.error("Error checking for local data:", error);
		return null;
	}
}

/**
 * Clear all local anonymous data before signing in.
 */
async function clearLocalAnonymousData(): Promise<void> {
	try {
		// Delete entries for anonymous user
		const entryCount = await entryRepository.deleteByUserId("anonymous");

		// Delete habits for anonymous user
		const habitCount = await habitRepository.deleteByUserId("anonymous");

		console.log(
			`[Auth] Cleared ${habitCount} anonymous habits and ${entryCount} entries`,
		);
	} catch (error) {
		console.error("Error clearing local data:", error);
	}
}

export type SignInChoice = "merge" | "abandon" | "cancel";

/**
 * Triggers Dexie Cloud login flow.
 * If there's local anonymous data, prompts user to choose merge vs abandon.
 * Returns the user's choice or null if no prompt was needed.
 */
export async function handleSignIn(
	onPromptNeeded?: (summary: LocalDataSummary) => Promise<SignInChoice>,
): Promise<void> {
	try {
		const localData = await getLocalAnonymousDataSummary();

		if (localData && onPromptNeeded) {
			const choice = await onPromptNeeded(localData);

			if (choice === "cancel") {
				return; // User cancelled sign-in
			}

			if (choice === "abandon") {
				await clearLocalAnonymousData();
			}
			// "merge" - just proceed, Dexie Cloud will merge the data
		}

		await db.cloud.login();
	} catch (error) {
		console.error("Error signing in:", error);
	}
}

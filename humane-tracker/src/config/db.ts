import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { Habit, HabitEntry } from "../types/habit";

// Extend Dexie with cloud addon
export class HumaneTrackerDB extends Dexie {
	habits!: Table<Habit, number>;
	entries!: Table<HabitEntry, number>;

	constructor() {
		super("HumaneTrackerDB", { addons: [dexieCloud] });

		// Define schema - using ++id for auto-increment
		this.version(1).stores({
			habits:
				"++id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "++id, habitId, userId, date, value, createdAt",
		});
	}
}

// Create database instance
export const db = new HumaneTrackerDB();

// Configure Dexie Cloud (optional - works offline if not configured)
const dexieCloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL;

if (dexieCloudUrl && dexieCloudUrl !== "https://your-db.dexie.cloud") {
	// Only configure cloud sync if URL is properly set
	db.cloud.configure({
		databaseUrl: dexieCloudUrl,
		requireAuth: false, // Allow local use without auth for now
		tryUseServiceWorker: true,
		// Exclude auto-incremented tables from sync (they use numeric IDs)
		unsyncedTables: ["habits", "entries"],
	});
} else {
	// Disable cloud sync - work in local-only mode
	// Still need to configure with unsyncedTables to avoid schema conflicts
	db.cloud.configure({
		databaseUrl: "https://placeholder.dexie.cloud",
		requireAuth: false,
		tryUseServiceWorker: false,
		unsyncedTables: ["habits", "entries"],
	});
	console.log("Dexie Cloud not configured - running in local-only mode");
}

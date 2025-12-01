import Dexie, { type Table } from "dexie";
import type { SyncLog } from "../types/syncLog";

// Separate database for sync logs - completely isolated from cloud sync
// This database is NEVER synced to Dexie Cloud and is purely local
export class SyncLogDB extends Dexie {
	syncLogs!: Table<SyncLog, string>;

	constructor() {
		super("HumaneTrackerSyncLogs"); // Separate database name

		// Version 1: Initial schema - local-only database
		this.version(1).stores({
			syncLogs: "id, timestamp, eventType, level", // NO @id - purely local!
		});
	}
}

// Create sync log database instance (completely separate from main database)
export const syncLogDB = new SyncLogDB();

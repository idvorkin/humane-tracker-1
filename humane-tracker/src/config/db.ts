import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import { SyncLogService } from "../services/syncLogService";
import type { Habit, HabitEntry } from "../types/habit";
import type { SyncLog } from "../types/syncLog";

// Extend Dexie with cloud addon
export class HumaneTrackerDB extends Dexie {
	habits!: Table<Habit, string>;
	entries!: Table<HabitEntry, string>;
	syncLogs!: Table<SyncLog, string>;

	constructor() {
		super("HumaneTrackerDB", { addons: [dexieCloud] });

		// Define schema - using @id for Dexie Cloud compatible auto-generated string IDs
		this.version(2).stores({
			habits:
				"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "@id, habitId, userId, date, value, createdAt",
		});

		// Version 3: Add syncLogs table for debug logging
		this.version(3).stores({
			habits:
				"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "@id, habitId, userId, date, value, createdAt",
			syncLogs: "@id, timestamp, eventType, level",
		});
	}
}

// Create database instance
export const db = new HumaneTrackerDB();

// Create sync log service with dependency injection (avoids circular dependency)
export const syncLogService = new SyncLogService(db.syncLogs);

// Configure Dexie Cloud (optional - works offline if not configured)
const dexieCloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL;
const isTestMode =
	typeof window !== "undefined" && window.location.search.includes("test=true");

// Enable debug mode for better error stack traces (recommended for development)
if (import.meta.env.DEV) {
	Dexie.debug = true;
	console.log("[Dexie] Debug mode enabled - enhanced error stack traces");
}

if (
	dexieCloudUrl &&
	dexieCloudUrl !== "https://your-db.dexie.cloud" &&
	!isTestMode
) {
	// Configure cloud sync with the provided URL
	db.cloud.configure({
		databaseUrl: dexieCloudUrl,
		requireAuth: true, // Require authentication for cloud sync
		tryUseServiceWorker: true,
	});

	// Set up comprehensive sync monitoring and logging
	console.log("[Dexie Cloud] Configuring sync with URL:", dexieCloudUrl);

	// Monitor sync state changes
	db.cloud.syncState.subscribe((syncState) => {
		try {
			const timestamp = new Date().toISOString();
			const logData = {
				phase: syncState.phase,
				status: syncState.status,
				progress: syncState.progress,
				license: syncState.license,
				error: syncState.error
					? {
							message: syncState.error.message,
							name: syncState.error.name,
							stack: syncState.error.stack,
						}
					: undefined,
			};
			console.log(`[Dexie Cloud] ${timestamp} Sync state:`, logData);

			// Log specific sync events with more detail
			if (syncState.phase === "pushing") {
				const message = `↑ Uploading changes (${syncState.progress ?? 0}%)`;
				console.log(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("syncState", "info", message, logData);
			} else if (syncState.phase === "pulling") {
				const message = `↓ Downloading changes (${syncState.progress ?? 0}%)`;
				console.log(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("syncState", "info", message, logData);
			} else if (syncState.phase === "in-sync") {
				const message = "✓ Sync complete";
				console.log(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("syncState", "success", message, logData);
			} else if (syncState.phase === "error") {
				const message = `✗ Sync error: ${syncState.error?.message || "Unknown error"}`;
				console.error(`[Dexie Cloud] ${timestamp} ${message}`, syncState.error);
				syncLogService.addLog("syncState", "error", message, logData);
			} else if (syncState.phase === "offline") {
				const message = "⚠ Offline mode";
				console.warn(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("syncState", "warning", message, logData);
			} else {
				// Log all other state changes
				const message = `Sync state: ${syncState.phase} (${syncState.status})`;
				syncLogService.addLog("syncState", "info", message, logData);
			}
		} catch (error) {
			console.error("[Dexie Cloud] Error in syncState subscription:", error);
		}
	});

	// Monitor WebSocket connection status
	db.cloud.webSocketStatus.subscribe((wsStatus) => {
		try {
			const timestamp = new Date().toISOString();
			console.log(`[Dexie Cloud] ${timestamp} WebSocket status:`, wsStatus);

			if (wsStatus === "connected") {
				const message = "✓ WebSocket connected - live sync active";
				console.log(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("webSocket", "success", message, {
					status: wsStatus,
				});
			} else if (wsStatus === "disconnected") {
				const message = "⚠ WebSocket disconnected - using HTTP polling";
				console.warn(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("webSocket", "warning", message, {
					status: wsStatus,
				});
			} else if (wsStatus === "error") {
				const message =
					"✗ WebSocket error - check domain whitelist in Dexie Cloud";
				console.error(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("webSocket", "error", message, {
					status: wsStatus,
				});
			} else if (wsStatus === "connecting") {
				const message = "○ WebSocket connecting...";
				console.log(`[Dexie Cloud] ${timestamp} ${message}`);
				syncLogService.addLog("webSocket", "info", message, {
					status: wsStatus,
				});
			} else {
				// Log all other status changes
				const message = `WebSocket status: ${wsStatus}`;
				syncLogService.addLog("webSocket", "info", message, {
					status: wsStatus,
				});
			}
		} catch (error) {
			console.error(
				"[Dexie Cloud] Error in webSocketStatus subscription:",
				error,
			);
		}
	});

	// Monitor persisted sync state for last sync timestamp
	db.cloud.persistedSyncState.subscribe((persistedState) => {
		try {
			if (persistedState?.timestamp) {
				const lastSyncTime = new Date(persistedState.timestamp);
				const secondsAgo = Math.round(
					(Date.now() - lastSyncTime.getTime()) / 1000,
				);
				const message = `Last successful sync: ${lastSyncTime.toLocaleString()} (${secondsAgo}s ago)`;
				console.log(`[Dexie Cloud] ${message}`);
				syncLogService.addLog(
					"persistedState",
					"info",
					message,
					persistedState,
				);
			}
		} catch (error) {
			console.error(
				"[Dexie Cloud] Error in persistedSyncState subscription:",
				error,
			);
		}
	});

	// Subscribe to sync complete events
	db.cloud.events.syncComplete.subscribe(() => {
		try {
			const timestamp = new Date().toISOString();
			const message = "🎉 Sync completed successfully";
			console.log(`[Dexie Cloud] ${timestamp} ${message}`);
			syncLogService.addLog("syncComplete", "success", message);
		} catch (error) {
			console.error("[Dexie Cloud] Error in syncComplete subscription:", error);
		}
	});

	console.log("[Dexie Cloud] Sync monitoring initialized");
} else {
	// Local-only mode - no cloud sync (also used in test mode)
	console.log("[Dexie Cloud] Not configured - running in local-only mode");
}

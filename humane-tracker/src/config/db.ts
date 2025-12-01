import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { EntryRecord, HabitRecord } from "../repositories/types";
import {
	normalizeDate,
	toDateString,
	toTimestamp,
} from "../repositories/types";
import { SyncLogService } from "../services/syncLogService";
import { syncLogDB } from "./syncLogDB";

// Extend Dexie with cloud addon
export class HumaneTrackerDB extends Dexie {
	// Use Record types (ISO strings) instead of domain types (Date objects)
	// The repository layer handles conversion between Record and domain types
	habits!: Table<HabitRecord, string>;
	entries!: Table<EntryRecord, string>;

	constructor() {
		super("HumaneTrackerDB", { addons: [dexieCloud] });

		// Version 2: Schema definition (dates can be Date objects or ISO strings)
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

		// Version 4: Migrate Date objects to ISO strings
		// Schema unchanged, just data migration
		this.version(4)
			.stores({
				habits:
					"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
				entries: "@id, habitId, userId, date, value, createdAt",
				syncLogs: "@id, timestamp, eventType, level",
			})
			.upgrade(async (tx) => {
				try {
					console.log("[Migration v4] Starting database migration...");

					// Migrate habits: convert Date objects to ISO strings
					const habitCount = await tx.table("habits").count();
					console.log(`[Migration v4] Migrating ${habitCount} habits...`);

					await tx
						.table("habits")
						.toCollection()
						.modify((habit) => {
							try {
								// Handle createdAt: could be Date (not migrated) or string (already migrated)
								if (habit.createdAt instanceof Date) {
									if (Number.isNaN(habit.createdAt.getTime())) {
										throw new Error(
											`Invalid createdAt date in habit ${habit.id}`,
										);
									}
									habit.createdAt = toTimestamp(habit.createdAt);
								} else if (typeof habit.createdAt === "string") {
									// Already migrated or from cloud sync - validate and keep
									normalizeDate(habit.createdAt); // Will throw if invalid
								}

								// Handle updatedAt: could be Date (not migrated) or string (already migrated)
								if (habit.updatedAt instanceof Date) {
									if (Number.isNaN(habit.updatedAt.getTime())) {
										throw new Error(
											`Invalid updatedAt date in habit ${habit.id}`,
										);
									}
									habit.updatedAt = toTimestamp(habit.updatedAt);
								} else if (typeof habit.updatedAt === "string") {
									// Already migrated or from cloud sync - validate and keep
									normalizeDate(habit.updatedAt); // Will throw if invalid
								}
							} catch (error) {
								console.error(
									`[Migration v4] Failed to convert habit ${habit.id}:`,
									error,
								);
								throw new Error(
									`Migration failed for habit ${habit.id}: ${error instanceof Error ? error.message : String(error)}`,
								);
							}
						});

					console.log(
						`[Migration v4] Successfully migrated ${habitCount} habits`,
					);

					// Migrate entries: convert Date objects to ISO strings
					const entryCount = await tx.table("entries").count();
					console.log(`[Migration v4] Migrating ${entryCount} entries...`);

					await tx
						.table("entries")
						.toCollection()
						.modify((entry) => {
							try {
								// Handle date: could be Date (not migrated) or string (already migrated)
								if (entry.date instanceof Date) {
									if (Number.isNaN(entry.date.getTime())) {
										throw new Error(`Invalid date in entry ${entry.id}`);
									}
									entry.date = toDateString(entry.date);
								} else if (typeof entry.date === "string") {
									// Already migrated or from cloud sync - validate and keep
									normalizeDate(entry.date); // Will throw if invalid
								}

								// Handle createdAt: could be Date (not migrated) or string (already migrated)
								if (entry.createdAt instanceof Date) {
									if (Number.isNaN(entry.createdAt.getTime())) {
										throw new Error(
											`Invalid createdAt date in entry ${entry.id}`,
										);
									}
									entry.createdAt = toTimestamp(entry.createdAt);
								} else if (typeof entry.createdAt === "string") {
									// Already migrated or from cloud sync - validate and keep
									normalizeDate(entry.createdAt); // Will throw if invalid
								}
							} catch (error) {
								console.error(
									`[Migration v4] Failed to convert entry ${entry.id}:`,
									error,
								);
								throw new Error(
									`Migration failed for entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`,
								);
							}
						});

					console.log(
						`[Migration v4] Successfully migrated ${entryCount} entries`,
					);
					console.log(
						`[Migration v4] Migration complete! Migrated ${habitCount} habits and ${entryCount} entries`,
					);
				} catch (error) {
					// Log full error with stack trace for debugging
					console.error(
						"[Migration v4] CRITICAL: Database migration failed:",
						error,
					);
					if (error instanceof Error && error.stack) {
						console.error("[Migration v4] Stack trace:", error.stack);
					}

					// Notify user - alert is appropriate here for critical migration failure
					// that would prevent the app from functioning correctly
					const errorMsg =
						error instanceof Error ? error.message : String(error);
					console.error(
						`[Migration v4] User notification: Database migration failed: ${errorMsg}. Please refresh the page or restore from backup.`,
					);

					// Only show alert in browser environment (not during tests)
					if (
						typeof window !== "undefined" &&
						!window.location.search.includes("test=true")
					) {
						alert(
							`Database migration failed: ${errorMsg}\n\nPlease try refreshing the page. If the problem persists, restore from backup or contact support.\n\nCheck the browser console for technical details.`,
						);
					}

					throw error;
				}
			});

		// Version 7: Remove syncLogs table completely (moved to separate database)
		// FINAL FIX: syncLogs is now in a completely separate IndexedDB database
		// (HumaneTrackerSyncLogs) that has NO connection to Dexie Cloud whatsoever.
		// This is the ultimate fix for issue #45 - no syncLogs data will ever sync to cloud.
		this.version(7).stores({
			habits:
				"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "@id, habitId, userId, date, value, createdAt",
			syncLogs: null, // Remove syncLogs table from this database
		});
	}
}

// Create database instance
export const db = new HumaneTrackerDB();

// Create sync log service using the separate sync log database
// This database is completely isolated from Dexie Cloud and will NEVER sync
export const syncLogService = new SyncLogService(syncLogDB.syncLogs);

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

	// Track if we've already alerted the user about login issues (to avoid repeated alerts)
	let hasAlertedAboutLogin = false;
	let initialStateTimeout: ReturnType<typeof setTimeout> | null = null;

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
			} else if (
				syncState.phase === "initial" &&
				syncState.status === "not-started"
			) {
				// Stuck in initial state - check if user is logged in
				const currentUser = db.cloud.currentUser.value;
				const isLoggedIn = currentUser?.isLoggedIn ?? false;
				const message = isLoggedIn
					? "⚠ Sync not started - authentication may be required"
					: "⚠ Sync not started - please log in to enable cloud sync";
				console.warn(`[Dexie Cloud] ${timestamp} ${message}`, {
					isLoggedIn,
					userId: currentUser?.userId,
				});
				syncLogService.addLog("syncState", "warning", message, logData);

				// Alert user if sync is stuck (only after a delay, giving them time to log in)
				if (
					typeof window !== "undefined" &&
					!window.location.search.includes("test=true")
				) {
					if (!isLoggedIn && !hasAlertedAboutLogin && !initialStateTimeout) {
						// Wait 10 seconds before alerting - gives user time to see login UI and interact
						initialStateTimeout = setTimeout(() => {
							// Re-check state before alerting to avoid false positives
							const stillNotStarted =
								db.cloud.syncState.value?.phase === "initial";
							const stillNotLoggedIn = !db.cloud.currentUser.value?.isLoggedIn;
							if (
								stillNotStarted &&
								stillNotLoggedIn &&
								!hasAlertedAboutLogin
							) {
								hasAlertedAboutLogin = true;
								alert(
									"Cloud sync is not started.\n\nPlease log in to enable cloud synchronization.\n\nCheck the Debug Logs for more details.",
								);
							}
						}, 10000); // 10 second delay
					}
				}
			} else {
				// Clear the timeout if we progress past initial state
				if (initialStateTimeout) {
					clearTimeout(initialStateTimeout);
					initialStateTimeout = null;
				}
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

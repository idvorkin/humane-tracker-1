import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type {
	AffirmationLogRecord,
	EntryRecord,
	HabitRecord,
} from "../repositories/types";
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
	affirmationLogs!: Table<AffirmationLogRecord, string>;

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

		// Version 5: Fix syncLogs to be local-only (change @id to id)
		// CRITICAL BUG FIX: syncLogs table was syncing to cloud, causing infinite loop.
		// Using @id marks a table for sync eligibility; server config controls which tables
		// actually sync. Since syncLogs was both @id-marked and server-configured to sync,
		// every sync event created a log entry, which synced, creating more events, ad infinitum.
		// Fix: Change @id to id (local-only) to prevent this table from ever syncing.
		this.version(5)
			.stores({
				habits:
					"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
				entries: "@id, habitId, userId, date, value, createdAt",
				syncLogs: "id, timestamp, eventType, level", // Changed from @id to id (local-only!)
			})
			.upgrade(async (tx) => {
				try {
					console.log(
						"[Migration v5] Fixing syncLogs table to be local-only...",
					);
					// Clear all existing sync logs - they're corrupted from the sync loop
					const count = await tx.table("syncLogs").count();
					console.log(
						`[Migration v5] Clearing ${count} corrupted sync logs...`,
					);
					await tx.table("syncLogs").clear();
					console.log(
						"[Migration v5] Migration complete! syncLogs is now local-only.",
					);
				} catch (error) {
					// Log full error with stack trace for debugging
					console.error(
						"[Migration v5] CRITICAL: Failed to fix syncLogs table:",
						error,
					);
					if (error instanceof Error && error.stack) {
						console.error("[Migration v5] Stack trace:", error.stack);
					}

					// Notify user - alert is appropriate here for critical migration failure
					// that would prevent the app from functioning correctly
					const errorMsg =
						error instanceof Error ? error.message : String(error);
					console.error(
						`[Migration v5] User notification: Database migration failed: ${errorMsg}. Please refresh the page or restore from backup.`,
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

		// Version 6: Convert entry dates from YYYY-MM-DD to full timestamps
		// Migration: YYYY-MM-DD strings → timestamp at noon local time
		this.version(6)
			.stores({
				habits:
					"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
				entries: "@id, habitId, userId, date, value, createdAt",
				syncLogs: "id, timestamp, eventType, level",
			})
			.upgrade(async (tx) => {
				try {
					console.log("[Migration v6] Converting entry dates to timestamps...");

					const entryCount = await tx.table("entries").count();
					console.log(`[Migration v6] Migrating ${entryCount} entry dates...`);

					let migratedCount = 0;
					let skippedCount = 0;

					await tx
						.table("entries")
						.toCollection()
						.modify((entry) => {
							try {
								// Only migrate if it's a date-only string (YYYY-MM-DD)
								if (
									typeof entry.date === "string" &&
									/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
								) {
									// Parse YYYY-MM-DD with validation
									const parts = entry.date.split("-");
									if (parts.length !== 3) {
										throw new Error(
											`Invalid date format: "${entry.date}". Expected YYYY-MM-DD`,
										);
									}

									const [year, month, day] = parts.map(Number);

									// Validate parsed numbers
									if (
										Number.isNaN(year) ||
										Number.isNaN(month) ||
										Number.isNaN(day)
									) {
										throw new Error(
											`Invalid date components in "${entry.date}": year=${year}, month=${month}, day=${day}`,
										);
									}

									// Validate ranges
									if (month < 1 || month > 12) {
										throw new Error(
											`Invalid month in "${entry.date}": ${month}. Must be 1-12`,
										);
									}
									if (day < 1 || day > 31) {
										throw new Error(
											`Invalid day in "${entry.date}": ${day}. Must be 1-31`,
										);
									}

									// Create date at noon local time (avoids DST edge cases)
									const date = new Date(year, month - 1, day, 12, 0, 0, 0);

									// Validate the Date object
									if (Number.isNaN(date.getTime())) {
										throw new Error(
											`Created invalid date from "${entry.date}"`,
										);
									}

									// Verify round-trip to catch invalid dates like Feb 30
									if (
										date.getFullYear() !== year ||
										date.getMonth() !== month - 1 ||
										date.getDate() !== day
									) {
										throw new Error(
											`Invalid date (e.g., Feb 30): "${entry.date}"`,
										);
									}

									entry.date = toTimestamp(date);
									migratedCount++;
								} else {
									// Validate it's actually a valid timestamp, not corrupted data
									try {
										normalizeDate(entry.date);
										skippedCount++;
									} catch (error) {
										throw new Error(
											`Entry ${entry.id} has corrupted date: "${entry.date}". ${error instanceof Error ? error.message : String(error)}`,
										);
									}
								}
							} catch (error) {
								console.error(
									`[Migration v6] Failed to convert entry ${entry.id}:`,
									error,
								);
								throw new Error(
									`Migration failed for entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`,
								);
							}
						});

					console.log(
						`[Migration v6] Migration complete! Migrated ${migratedCount} entries, skipped ${skippedCount} entries (already timestamps)`,
					);
				} catch (error) {
					// Log full error with stack trace for debugging
					console.error(
						"[Migration v6] CRITICAL: Database migration failed:",
						error,
					);
					if (error instanceof Error && error.stack) {
						console.error("[Migration v6] Stack trace:", error.stack);
					}

					const errorMsg =
						error instanceof Error ? error.message : String(error);
					console.error(
						`[Migration v6] User notification: Database migration failed: ${errorMsg}. Please refresh the page or restore from backup.`,
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

		// Version 8: Schema version bump (variants removed in Phase 5)
		// Note: Variants were originally added here but later removed.
		// Keeping version for migration compatibility.
		this.version(8).stores({
			habits:
				"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "@id, habitId, userId, date, value, createdAt",
		});

		// Version 9: Migrate "Shoulder Ys" to "Shoulder Accessory"
		// This migration renames the habit and moves entries.
		// Note: Variants were removed in Phase 5 of Tag Habits implementation.
		this.version(9)
			.stores({
				habits:
					"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
				entries: "@id, habitId, userId, date, value, createdAt",
			})
			.upgrade(async (tx) => {
				try {
					console.log(
						"[Migration v9] Migrating Shoulder Ys to Shoulder Accessory...",
					);

					// Find all "Shoulder Ys" habits
					const shoulderYsHabits = await tx
						.table("habits")
						.where("name")
						.equals("Shoulder Ys")
						.toArray();

					if (shoulderYsHabits.length === 0) {
						console.log("[Migration v9] No Shoulder Ys habits found, skipping");
						return;
					}

					console.log(
						`[Migration v9] Found ${shoulderYsHabits.length} Shoulder Ys habit(s) to migrate`,
					);

					for (const oldHabit of shoulderYsHabits) {
						const userId = oldHabit.userId;

						// Find existing "Shoulder Accessory" for this user
						let shoulderAccessory = await tx
							.table("habits")
							.where("name")
							.equals("Shoulder Accessory")
							.and((h: { userId: string }) => h.userId === userId)
							.first();

						// If no Shoulder Accessory exists, create one
						if (!shoulderAccessory) {
							const now = toTimestamp(new Date());
							const newId = `hbt${crypto.randomUUID().replace(/-/g, "")}`;
							shoulderAccessory = {
								id: newId,
								name: "Shoulder Accessory",
								category: oldHabit.category || "Mobility",
								targetPerWeek: oldHabit.targetPerWeek || 3,
								userId,
								createdAt: now,
								updatedAt: now,
							};
							await tx.table("habits").add(shoulderAccessory);
							console.log(
								`[Migration v9] Created Shoulder Accessory for user ${userId}`,
							);
						}

						// Move entries from Shoulder Ys to Shoulder Accessory
						const entries = await tx
							.table("entries")
							.where("habitId")
							.equals(oldHabit.id)
							.toArray();

						if (entries.length > 0) {
							console.log(
								`[Migration v9] Moving ${entries.length} entries from Shoulder Ys to Shoulder Accessory`,
							);

							for (const entry of entries) {
								await tx.table("entries").update(entry.id, {
									habitId: shoulderAccessory.id,
								});
							}
						}

						// Delete the old Shoulder Ys habit
						await tx.table("habits").delete(oldHabit.id);
						console.log(
							`[Migration v9] Deleted old Shoulder Ys habit for user ${userId}`,
						);
					}

					console.log("[Migration v9] Migration complete!");
				} catch (error) {
					console.error("[Migration v9] CRITICAL: Migration failed:", error);
					if (error instanceof Error && error.stack) {
						console.error("[Migration v9] Stack trace:", error.stack);
					}
					throw error;
				}
			});

		// Version 10: Add affirmationLogs table for tracking affirmation notes
		this.version(10).stores({
			habits:
				"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "@id, habitId, userId, date, value, createdAt",
			affirmationLogs: "@id, userId, date, affirmationTitle, logType, createdAt",
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
// Skip Dexie Cloud in unit test mode (test=true) or login UI test mode (e2e-login=true)
// Regular E2E tests now use the real app with Dexie Cloud (works offline due to ID generation fix)
const isTestMode =
	typeof window !== "undefined" &&
	(window.location.search.includes("test=true") ||
		window.location.search.includes("e2e-login=true"));

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
	// requireAuth: false enables local-first behavior - users can work offline
	// or without authentication, and data syncs when they sign in
	db.cloud.configure({
		databaseUrl: dexieCloudUrl,
		requireAuth: false, // Allow local writes without authentication
		tryUseServiceWorker: true,
	});

	// Set up comprehensive sync monitoring and logging
	console.log("[Dexie Cloud] Configuring sync with URL:", dexieCloudUrl);

	// ============================================================
	// STALE AUTH TOKEN DETECTION
	// ============================================================
	// Detects when WebSocket is "connected" but sync is stuck in "initial" phase
	// with pending mutations - indicates stale auth token that needs refresh.
	// See: https://github.com/dexie/Dexie.js/issues/2225
	// ============================================================

	let staleAuthCheckTimer: ReturnType<typeof setTimeout> | null = null;
	let lastSyncPhase: string | null = null;
	let stuckInInitialSince: number | null = null;
	let hasAttemptedSyncRecovery = false;

	const STALE_AUTH_DETECTION_DELAY_MS = 30_000; // 30 seconds before first check
	const STALE_AUTH_RECOVERY_DELAY_MS = 15_000; // 15 more seconds after sync attempt

	async function checkForStaleAuth() {
		try {
			// Get current state
			const syncState = db.cloud.syncState.getValue();
			const wsStatus = db.cloud.webSocketStatus.getValue();
			const persistedState = db.cloud.persistedSyncState.getValue();
			const currentUser = db.cloud.currentUser.getValue();

			// Only check if user is logged in and we've synced before
			if (!currentUser?.userId || !persistedState?.initiallySynced) {
				return;
			}

			// Check if stuck: phase=initial, connected, but not syncing
			const isStuck =
				syncState?.phase === "initial" &&
				(syncState?.status === "connected" || wsStatus === "connected");

			if (!isStuck) {
				// Reset tracking if we're no longer stuck
				stuckInInitialSince = null;
				hasAttemptedSyncRecovery = false;
				return;
			}

			// Check for pending mutations
			const idbDatabase = db.backendDB();
			if (!idbDatabase) return;

			let pendingMutationCount = 0;
			const storeNames = Array.from(idbDatabase.objectStoreNames);
			for (const storeName of storeNames) {
				if (storeName.endsWith("_mutations")) {
					try {
						const count = await db.table(storeName).count();
						pendingMutationCount += count;
					} catch {
						// Table might not be accessible
					}
				}
			}

			// If no pending mutations, not a stale auth issue
			if (pendingMutationCount === 0) {
				return;
			}

			const stuckDuration = stuckInInitialSince
				? Date.now() - stuckInInitialSince
				: 0;

			console.warn(
				`[Dexie Cloud] Potential stale auth detected: phase=${syncState?.phase}, ` +
					`status=${syncState?.status}, wsStatus=${wsStatus}, ` +
					`pendingMutations=${pendingMutationCount}, stuckFor=${Math.round(stuckDuration / 1000)}s`,
			);

			// First attempt: try forcing a sync
			if (!hasAttemptedSyncRecovery) {
				hasAttemptedSyncRecovery = true;
				console.log("[Dexie Cloud] Attempting sync recovery...");
				syncLogService.addLog(
					"staleAuth",
					"warning",
					`Stale auth detected (${pendingMutationCount} pending mutations). Attempting sync recovery...`,
					{ pendingMutationCount, stuckDuration },
				);

				try {
					await db.cloud.sync({ wait: true, purpose: "push" });
					console.log("[Dexie Cloud] Sync recovery attempt completed");
				} catch (syncError) {
					console.error("[Dexie Cloud] Sync recovery failed:", syncError);
				}

				// Schedule another check after recovery delay
				staleAuthCheckTimer = setTimeout(
					checkForStaleAuth,
					STALE_AUTH_RECOVERY_DELAY_MS,
				);
				return;
			}

			// Second attempt failed - notify user to re-login
			console.error(
				"[Dexie Cloud] Stale auth token confirmed. User needs to re-login.",
			);
			syncLogService.addLog(
				"staleAuth",
				"error",
				`Stale auth token confirmed. ${pendingMutationCount} mutations stuck. Please log out and log back in.`,
				{ pendingMutationCount, stuckDuration },
			);

			// Dispatch custom event so UI can react
			window.dispatchEvent(
				new CustomEvent("dexie-cloud-stale-auth", {
					detail: {
						pendingMutationCount,
						stuckDuration,
						message:
							"Your session may have expired. Please log out and log back in to sync your changes.",
					},
				}),
			);
		} catch (error) {
			console.error("[Dexie Cloud] Error in stale auth check:", error);
		}
	}

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

			// ============================================================
			// STALE AUTH DETECTION TRIGGER
			// ============================================================
			// Start timer when entering stuck state, clear when exiting
			const isInStuckState =
				syncState.phase === "initial" && syncState.status === "connected";
			const wasInStuckState =
				lastSyncPhase === "initial" && syncState.status === "connected";

			if (isInStuckState && !wasInStuckState) {
				// Just entered potential stuck state
				stuckInInitialSince = Date.now();
				if (staleAuthCheckTimer) {
					clearTimeout(staleAuthCheckTimer);
				}
				staleAuthCheckTimer = setTimeout(
					checkForStaleAuth,
					STALE_AUTH_DETECTION_DELAY_MS,
				);
				console.log(
					"[Dexie Cloud] Started stale auth detection timer (30s)",
				);
			} else if (!isInStuckState && stuckInInitialSince !== null) {
				// Exited stuck state - cancel timer and reset
				if (staleAuthCheckTimer) {
					clearTimeout(staleAuthCheckTimer);
					staleAuthCheckTimer = null;
				}
				stuckInInitialSince = null;
				hasAttemptedSyncRecovery = false;
				console.log("[Dexie Cloud] Cleared stale auth detection timer - sync progressing");
			}

			lastSyncPhase = syncState.phase;
			// ============================================================

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

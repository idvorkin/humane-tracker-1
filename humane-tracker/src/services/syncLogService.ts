import type { Table } from "dexie";
import type { SyncLog, SyncLogEventType, SyncLogLevel } from "../types/syncLog";

const MAX_LOGS = 2000;

/**
 * Service for managing sync debug logs
 * Uses dependency injection to avoid circular dependencies
 */
export class SyncLogService {
	constructor(private syncLogsTable: Table<SyncLog, string>) {}

	/**
	 * Add a new log entry
	 */
	async addLog(
		eventType: SyncLogEventType,
		level: SyncLogLevel,
		message: string,
		data?: unknown,
	): Promise<void> {
		try {
			// Add the new log (local-only, not synced)
			await this.syncLogsTable.add({
				id: crypto.randomUUID(),
				timestamp: new Date(),
				eventType,
				level,
				message,
				data,
			});

			// Clean up old logs if we exceed the limit
			await this.enforceLimit();
		} catch (error) {
			// Check for QuotaExceededError specifically - this needs user attention
			if (
				error instanceof Error &&
				(error.name === "QuotaExceededError" || error.message.includes("quota"))
			) {
				console.error(
					"CRITICAL: Storage quota exceeded while adding sync log. User action required.",
					error,
				);
				// Rethrow quota errors so user can be notified
				throw new Error(
					"Storage quota exceeded. Please clear old data or increase storage quota.",
				);
			}

			// Other errors: silently fail - don't break the app if logging fails
			console.error("Failed to add sync log:", error);
		}
	}

	/**
	 * Get all logs, newest first
	 */
	async getLogs(): Promise<SyncLog[]> {
		const logs = await this.syncLogsTable
			.orderBy("timestamp")
			.reverse()
			.toArray();
		return logs;
	}

	/**
	 * Get log count
	 */
	async getCount(): Promise<number> {
		const count = await this.syncLogsTable.count();
		return count;
	}

	/**
	 * Clear all logs
	 * Throws error if operation fails
	 */
	async clearAll(): Promise<void> {
		try {
			await this.syncLogsTable.clear();
		} catch (error) {
			console.error("Failed to clear sync logs:", error);
			throw new Error(
				`Failed to clear sync logs: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Enforce the maximum log limit by deleting oldest entries
	 */
	private async enforceLimit(): Promise<void> {
		const count = await this.syncLogsTable.count();
		if (count > MAX_LOGS) {
			const toDelete = count - MAX_LOGS;
			// Get oldest logs to delete
			const oldestLogs = await this.syncLogsTable
				.orderBy("timestamp")
				.limit(toDelete)
				.toArray();
			// Delete them
			await this.syncLogsTable.bulkDelete(oldestLogs.map((log) => log.id));
		}
	}

	/**
	 * Export all logs as JSON string
	 */
	async exportLogs(): Promise<string> {
		const logs = await this.getLogs();
		return JSON.stringify(logs, null, 2);
	}
}

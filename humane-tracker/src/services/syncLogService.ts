import { db } from "../config/db";
import type { SyncLog, SyncLogEventType, SyncLogLevel } from "../types/syncLog";

const MAX_LOGS = 500;

/**
 * Service for managing sync debug logs
 */
export class SyncLogService {
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
			// Add the new log
			await db.syncLogs.add({
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
			// Silently fail - don't break the app if logging fails
			console.error("Failed to add sync log:", error);
		}
	}

	/**
	 * Get all logs, newest first
	 */
	async getLogs(): Promise<SyncLog[]> {
		try {
			return await db.syncLogs.orderBy("timestamp").reverse().toArray();
		} catch (error) {
			console.error("Failed to get sync logs:", error);
			return [];
		}
	}

	/**
	 * Get log count
	 */
	async getCount(): Promise<number> {
		try {
			return await db.syncLogs.count();
		} catch (error) {
			console.error("Failed to count sync logs:", error);
			return 0;
		}
	}

	/**
	 * Clear all logs
	 */
	async clearAll(): Promise<void> {
		try {
			await db.syncLogs.clear();
		} catch (error) {
			console.error("Failed to clear sync logs:", error);
		}
	}

	/**
	 * Enforce the maximum log limit by deleting oldest entries
	 */
	private async enforceLimit(): Promise<void> {
		try {
			const count = await db.syncLogs.count();
			if (count > MAX_LOGS) {
				const toDelete = count - MAX_LOGS;
				// Get oldest logs to delete
				const oldestLogs = await db.syncLogs
					.orderBy("timestamp")
					.limit(toDelete)
					.toArray();
				// Delete them
				await db.syncLogs.bulkDelete(oldestLogs.map((log) => log.id));
			}
		} catch (error) {
			console.error("Failed to enforce log limit:", error);
		}
	}

	/**
	 * Export all logs as JSON string
	 */
	async exportLogs(): Promise<string> {
		try {
			const logs = await this.getLogs();
			return JSON.stringify(logs, null, 2);
		} catch (error) {
			console.error("Failed to export sync logs:", error);
			return "[]";
		}
	}
}

// Export singleton instance
export const syncLogService = new SyncLogService();

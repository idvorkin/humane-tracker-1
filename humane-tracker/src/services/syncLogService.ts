import type { Table } from "dexie";
import type { SyncLog, SyncLogEventType, SyncLogLevel } from "../types/syncLog";

const MAX_LOGS = 500;

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
			// Add the new log with 'syn' prefix for Dexie Cloud @id compatibility
			await this.syncLogsTable.add({
				id: `syn${crypto.randomUUID()}`,
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
		try {
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
		} catch (error) {
			console.error("Failed to enforce log limit:", error);
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

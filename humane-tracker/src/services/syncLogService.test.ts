import Dexie, { type Table } from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SyncLog } from "../types/syncLog";
import { SyncLogService } from "./syncLogService";

// Create a test-only database for sync logs
class TestSyncLogDB extends Dexie {
	syncLogs!: Table<SyncLog, string>;

	constructor() {
		super("TestSyncLogDB");
		this.version(1).stores({
			syncLogs: "id, timestamp, eventType, level",
		});
	}
}

describe("SyncLogService", () => {
	let testDb: TestSyncLogDB;
	let syncLogService: SyncLogService;

	beforeEach(() => {
		testDb = new TestSyncLogDB();
		syncLogService = new SyncLogService(testDb.syncLogs);
	});

	afterEach(async () => {
		await testDb.syncLogs.clear();
		await testDb.delete();
	});

	describe("addLog", () => {
		it("adds a log entry to the database", async () => {
			await syncLogService.addLog("syncState", "info", "Test message");

			const logs = await testDb.syncLogs.toArray();
			expect(logs).toHaveLength(1);
			expect(logs[0].eventType).toBe("syncState");
			expect(logs[0].level).toBe("info");
			expect(logs[0].message).toBe("Test message");
			expect(logs[0].id).toBeDefined();
			expect(logs[0].timestamp).toBeInstanceOf(Date);
		});

		it("adds a log entry with data", async () => {
			const testData = { foo: "bar", count: 42 };
			await syncLogService.addLog(
				"webSocket",
				"success",
				"Connected",
				testData,
			);

			const logs = await testDb.syncLogs.toArray();
			expect(logs).toHaveLength(1);
			expect(logs[0].data).toEqual(testData);
		});

		it("handles different event types", async () => {
			await syncLogService.addLog("syncState", "info", "Sync state");
			await syncLogService.addLog("webSocket", "success", "WebSocket");
			await syncLogService.addLog("persistedState", "warning", "Persisted");
			await syncLogService.addLog("syncComplete", "success", "Complete");

			const logs = await testDb.syncLogs.toArray();
			expect(logs).toHaveLength(4);
			const eventTypes = logs.map((l) => l.eventType).sort();
			expect(eventTypes).toEqual([
				"persistedState",
				"syncComplete",
				"syncState",
				"webSocket",
			]);
		});

		it("handles different log levels", async () => {
			await syncLogService.addLog("syncState", "info", "Info");
			await syncLogService.addLog("syncState", "success", "Success");
			await syncLogService.addLog("syncState", "warning", "Warning");
			await syncLogService.addLog("syncState", "error", "Error");

			const logs = await testDb.syncLogs.toArray();
			expect(logs).toHaveLength(4);
			const levels = logs.map((l) => l.level).sort();
			expect(levels).toEqual(["error", "info", "success", "warning"]);
		});
	});

	describe("getLogs", () => {
		it("returns empty array when no logs exist", async () => {
			const logs = await syncLogService.getLogs();
			expect(logs).toEqual([]);
		});

		it("returns logs in reverse chronological order (newest first)", async () => {
			// Add logs with slight delay to ensure different timestamps
			await syncLogService.addLog("syncState", "info", "First");
			await new Promise((resolve) => setTimeout(resolve, 10));
			await syncLogService.addLog("syncState", "info", "Second");
			await new Promise((resolve) => setTimeout(resolve, 10));
			await syncLogService.addLog("syncState", "info", "Third");

			const logs = await syncLogService.getLogs();
			expect(logs).toHaveLength(3);
			expect(logs[0].message).toBe("Third");
			expect(logs[1].message).toBe("Second");
			expect(logs[2].message).toBe("First");
		});
	});

	describe("getCount", () => {
		it("returns 0 when no logs exist", async () => {
			const count = await syncLogService.getCount();
			expect(count).toBe(0);
		});

		it("returns correct count of logs", async () => {
			await syncLogService.addLog("syncState", "info", "Log 1");
			await syncLogService.addLog("syncState", "info", "Log 2");
			await syncLogService.addLog("syncState", "info", "Log 3");

			const count = await syncLogService.getCount();
			expect(count).toBe(3);
		});
	});

	describe("clearAll", () => {
		it("removes all logs from database", async () => {
			await syncLogService.addLog("syncState", "info", "Log 1");
			await syncLogService.addLog("syncState", "info", "Log 2");

			await syncLogService.clearAll();

			const logs = await testDb.syncLogs.toArray();
			expect(logs).toHaveLength(0);
		});

		it("works when database is already empty", async () => {
			await syncLogService.clearAll();

			const logs = await testDb.syncLogs.toArray();
			expect(logs).toHaveLength(0);
		});
	});

	describe("enforceLimit", () => {
		it("keeps logs under 2000 entries", async () => {
			// Add 2005 logs
			for (let i = 0; i < 2005; i++) {
				await syncLogService.addLog("syncState", "info", `Log ${i}`);
			}

			// Should have enforced limit to 2000
			const count = await syncLogService.getCount();
			expect(count).toBe(2000);
		}, 30000);

		it("removes oldest logs when limit exceeded", async () => {
			// Add 2010 logs
			for (let i = 0; i < 2010; i++) {
				await syncLogService.addLog("syncState", "info", `Log ${i}`);
			}

			// Verify the limit was enforced
			const count = await syncLogService.getCount();
			expect(count).toBe(2000);

			// Get the logs to verify content
			const logs = await syncLogService.getLogs();
			expect(logs).toHaveLength(2000);

			// Verify we have recent logs (at least some from the high numbers)
			const hasRecentLogs = logs.some((l) =>
				l.message.match(/Log (200[0-9]|199[5-9])/),
			);
			expect(hasRecentLogs).toBe(true);
		}, 30000);
	});

	describe("exportLogs", () => {
		it("exports empty array when no logs exist", async () => {
			const json = await syncLogService.exportLogs();
			expect(json).toBe("[]");
		});

		it("exports logs as formatted JSON string", async () => {
			await syncLogService.addLog("syncState", "info", "Test log");

			const json = await syncLogService.exportLogs();
			const parsed = JSON.parse(json);

			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed).toHaveLength(1);
			expect(parsed[0].message).toBe("Test log");
		});

		it("exports multiple logs in reverse chronological order", async () => {
			await syncLogService.addLog("syncState", "info", "First");
			await new Promise((resolve) => setTimeout(resolve, 10));
			await syncLogService.addLog("syncState", "info", "Second");

			const json = await syncLogService.exportLogs();
			const parsed = JSON.parse(json);

			expect(parsed).toHaveLength(2);
			expect(parsed[0].message).toBe("Second");
			expect(parsed[1].message).toBe("First");
		});

		it("includes all log fields in export", async () => {
			const testData = { phase: "pushing", progress: 50 };
			await syncLogService.addLog(
				"syncState",
				"warning",
				"Test message",
				testData,
			);

			const json = await syncLogService.exportLogs();
			const parsed = JSON.parse(json);

			expect(parsed[0]).toMatchObject({
				eventType: "syncState",
				level: "warning",
				message: "Test message",
				data: testData,
			});
			expect(parsed[0].id).toBeDefined();
			expect(parsed[0].timestamp).toBeDefined();
		});
	});

	describe("integration scenarios", () => {
		it("handles rapid log additions", async () => {
			// Simulate rapid sync events
			const promises = [];
			for (let i = 0; i < 50; i++) {
				promises.push(syncLogService.addLog("syncState", "info", `Event ${i}`));
			}
			await Promise.all(promises);

			const count = await syncLogService.getCount();
			expect(count).toBe(50);
		});

		it("maintains data integrity across operations", async () => {
			// Add logs
			await syncLogService.addLog("syncState", "info", "Log 1");
			await syncLogService.addLog("webSocket", "success", "Log 2");

			// Get count
			expect(await syncLogService.getCount()).toBe(2);

			// Export
			const json = await syncLogService.exportLogs();
			expect(JSON.parse(json)).toHaveLength(2);

			// Clear
			await syncLogService.clearAll();
			expect(await syncLogService.getCount()).toBe(0);

			// Add more
			await syncLogService.addLog("syncState", "info", "Log 3");
			expect(await syncLogService.getCount()).toBe(1);
		});
	});
});

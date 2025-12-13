export type SyncLogEventType =
	| "syncState"
	| "webSocket"
	| "persistedState"
	| "syncComplete"
	| "staleAuth";

export type SyncLogLevel = "info" | "success" | "warning" | "error";

export interface SyncLog {
	id: string;
	timestamp: Date;
	eventType: SyncLogEventType;
	level: SyncLogLevel;
	message: string;
	data?: unknown; // Full event data for technical details
}

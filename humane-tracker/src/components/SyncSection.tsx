import type { SyncState } from "dexie-cloud-addon";
import { useLiveQuery, useObservable } from "dexie-react-hooks";
import { useState } from "react";
import { db, syncLogService } from "../config/db";
import type { SyncLog } from "../types/syncLog";
import { ChevronIcon, SyncIcon } from "./icons/MenuIcons";

type SyncStatePhase =
	| "initial"
	| "not-in-sync"
	| "pushing"
	| "pulling"
	| "in-sync"
	| "error"
	| "offline";

type WebSocketStatus =
	| "not-started"
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

interface PersistedSyncState {
	timestamp?: Date;
	serverRevision?: unknown;
	initiallySynced?: boolean;
}

function getSyncStatusLabel(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	isLocalMode: boolean,
): { label: string; status: "success" | "warning" | "error" | "neutral" } {
	if (isLocalMode) {
		return { label: "Local Only", status: "neutral" };
	}
	if (!syncState) {
		return { label: "Not configured", status: "neutral" };
	}

	const phase = syncState.phase as SyncStatePhase;
	if (phase === "error" || syncState.status === "error") {
		return { label: "Error", status: "error" };
	}
	if (phase === "offline" || syncState.status === "offline") {
		return { label: "Offline", status: "warning" };
	}
	if (syncState.status === "connecting" || phase === "initial") {
		return { label: "Connecting...", status: "warning" };
	}
	if (phase === "pushing") {
		return { label: "Uploading...", status: "warning" };
	}
	if (phase === "pulling") {
		return { label: "Downloading...", status: "warning" };
	}
	if (phase === "in-sync" && wsStatus === "connected") {
		return { label: "Synced (Live)", status: "success" };
	}
	if (phase === "in-sync") {
		return { label: "Synced", status: "success" };
	}

	return { label: syncState.phase as string, status: "neutral" };
}

function formatTimeAgo(date: Date | null | undefined): string {
	if (!date) return "Never";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	if (diffSecs < 10) return "Just now";
	if (diffSecs < 60) return `${diffSecs}s ago`;
	const diffMins = Math.floor(diffSecs / 60);
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	return date.toLocaleDateString();
}

function getPhaseLabel(phase: SyncStatePhase): string {
	switch (phase) {
		case "initial":
			return "Initializing";
		case "not-in-sync":
			return "Pending sync";
		case "pushing":
			return "Uploading";
		case "pulling":
			return "Downloading";
		case "in-sync":
			return "In sync";
		case "error":
			return "Error";
		case "offline":
			return "Offline";
		default:
			return phase;
	}
}

function getWsStatusLabel(status: WebSocketStatus | null): string {
	if (!status) return "Not started";
	switch (status) {
		case "not-started":
			return "Not started";
		case "connecting":
			return "Connecting...";
		case "connected":
			return "Connected";
		case "disconnected":
			return "Disconnected";
		case "error":
			return "Error";
		default:
			return status;
	}
}

function getLevelBadgeClass(level: SyncLog["level"]): string {
	switch (level) {
		case "success":
			return "sync-log-badge-success";
		case "error":
			return "sync-log-badge-error";
		case "warning":
			return "sync-log-badge-warning";
		default:
			return "sync-log-badge-info";
	}
}

function getEventTypeLabel(eventType: SyncLog["eventType"]): string {
	switch (eventType) {
		case "syncState":
			return "Sync";
		case "webSocket":
			return "WS";
		case "persistedState":
			return "Save";
		case "syncComplete":
			return "Done";
		default:
			return eventType;
	}
}

interface SyncSectionProps {
	isLocalMode: boolean;
}

export function SyncSection({ isLocalMode }: SyncSectionProps) {
	const [detailsExpanded, setDetailsExpanded] = useState(false);
	const [logsExpanded, setLogsExpanded] = useState(false);
	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);

	// Sync state observables
	const syncStateFromCloud = useObservable(() => db.cloud.syncState, []) as
		| SyncState
		| undefined;
	const wsStatusFromCloud = useObservable(() => db.cloud.webSocketStatus, []) as
		| WebSocketStatus
		| undefined;
	const persistedState = useObservable(
		() => db.cloud.persistedSyncState,
		[],
	) as PersistedSyncState | null;

	// Logs
	const logs = useLiveQuery(() => syncLogService.getLogs(), []) ?? [];
	const recentLogs = logs.slice(0, 20); // Show only last 20 in the expando

	const syncState = isLocalMode ? null : (syncStateFromCloud ?? null);
	const wsStatus = isLocalMode ? null : (wsStatusFromCloud ?? null);
	const syncStatus = getSyncStatusLabel(syncState, wsStatus, isLocalMode);
	const phase = (syncState?.phase ?? "initial") as SyncStatePhase;
	const lastSynced = persistedState?.timestamp
		? new Date(persistedState.timestamp)
		: null;

	const handleSyncNow = async () => {
		try {
			await db.cloud.sync();
		} catch (err) {
			console.error("Manual sync failed:", err);
		}
	};

	const handleDownloadLogs = async () => {
		try {
			const logsJson = await syncLogService.exportLogs();
			const blob = new Blob([logsJson], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const a = document.createElement("a");
			a.href = url;
			a.download = `sync-logs-${timestamp}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to download logs:", err);
		}
	};

	const handleCopyLogs = async () => {
		try {
			const logsJson = await syncLogService.exportLogs();
			await navigator.clipboard.writeText(logsJson);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (err) {
			console.error("Failed to copy logs:", err);
		}
	};

	const handleClearLogs = async () => {
		if (confirm("Clear all debug logs?")) {
			try {
				await syncLogService.clearAll();
			} catch (err) {
				console.error("Failed to clear logs:", err);
			}
		}
	};

	return (
		<div className="settings-section">
			<div className="settings-section-header">
				<div className="settings-section-icon">
					<SyncIcon />
				</div>
				<span className="settings-section-title">Cloud Sync</span>
			</div>
			<div className="settings-section-content">
				{/* Status row with Sync Now button */}
				<div className="sync-status-row">
					<div className="sync-status-left">
						<span className="settings-info-label">Status</span>
						<span
							className={`settings-status-badge settings-status-${syncStatus.status}`}
						>
							<span className="settings-status-dot" />
							{syncStatus.label}
						</span>
					</div>
					{!isLocalMode && (
						<button
							className="sync-now-button"
							onClick={handleSyncNow}
							title="Sync now"
						>
							Sync
						</button>
					)}
				</div>

				{/* Details expando */}
				<button
					className={`sync-expando-header ${detailsExpanded ? "expanded" : ""}`}
					onClick={() => setDetailsExpanded(!detailsExpanded)}
				>
					<ChevronIcon
						className={`sync-expando-chevron ${detailsExpanded ? "open" : ""}`}
					/>
					<span>Details</span>
				</button>
				{detailsExpanded && (
					<div className="sync-expando-content">
						<div className="sync-detail-row">
							<span>Phase</span>
							<span>{getPhaseLabel(phase)}</span>
						</div>
						<div className="sync-detail-row">
							<span>Last synced</span>
							<span>{formatTimeAgo(lastSynced)}</span>
						</div>
						<div className="sync-detail-row">
							<span>WebSocket</span>
							<span>{getWsStatusLabel(wsStatus)}</span>
						</div>
					</div>
				)}

				{/* Logs expando */}
				<button
					className={`sync-expando-header ${logsExpanded ? "expanded" : ""}`}
					onClick={() => setLogsExpanded(!logsExpanded)}
				>
					<ChevronIcon
						className={`sync-expando-chevron ${logsExpanded ? "open" : ""}`}
					/>
					<span>Logs ({logs.length})</span>
				</button>
				{logsExpanded && (
					<div className="sync-expando-content">
						{/* Log actions */}
						<div className="sync-log-actions">
							<button onClick={handleDownloadLogs} disabled={logs.length === 0}>
								Download
							</button>
							<button onClick={handleCopyLogs} disabled={logs.length === 0}>
								{copySuccess ? "Copied!" : "Copy"}
							</button>
							<button onClick={handleClearLogs} disabled={logs.length === 0}>
								Clear
							</button>
						</div>

						{/* Log entries */}
						{recentLogs.length === 0 ? (
							<div className="sync-log-empty">No sync events yet</div>
						) : (
							<div className="sync-log-list">
								{recentLogs.map((log) => (
									<div key={log.id} className="sync-log-entry">
										<div
											className="sync-log-entry-header"
											onClick={() =>
												setExpandedLogId(
													expandedLogId === log.id ? null : log.id,
												)
											}
										>
											<span
												className={`sync-log-badge ${getLevelBadgeClass(log.level)}`}
											>
												{getEventTypeLabel(log.eventType)}
											</span>
											<span className="sync-log-message">{log.message}</span>
											<span className="sync-log-time">
												{formatTimeAgo(log.timestamp)}
											</span>
										</div>
										{expandedLogId === log.id && log.data ? (
											<pre className="sync-log-details">
												{JSON.stringify(log.data, null, 2)}
											</pre>
										) : null}
									</div>
								))}
								{logs.length > 20 && (
									<div className="sync-log-more">
										+{logs.length - 20} more logs (download to see all)
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

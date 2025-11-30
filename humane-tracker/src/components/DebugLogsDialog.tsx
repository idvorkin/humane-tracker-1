import { useLiveQuery } from "dexie-react-hooks";
import type React from "react";
import { useState } from "react";
import { syncLogService } from "../config/db";
import type { SyncLog } from "../types/syncLog";
import "./DebugLogsDialog.css";

interface DebugLogsDialogProps {
	onClose: () => void;
}

export function DebugLogsDialog({ onClose }: DebugLogsDialogProps) {
	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [clearError, setClearError] = useState<string | null>(null);

	// Live query to get logs (automatically updates when logs change)
	const logs = useLiveQuery(() => syncLogService.getLogs(), []) ?? [];

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleClearAll = async () => {
		if (confirm("Are you sure you want to clear all debug logs?")) {
			try {
				setClearError(null);
				await syncLogService.clearAll();
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error occurred";
				setClearError(`Failed to clear logs: ${errorMessage}`);
				console.error("Failed to clear logs:", error);
			}
		}
	};

	const handleCopyLogs = async () => {
		try {
			setCopyError(null);
			setCopySuccess(false);
			const logsJson = await syncLogService.exportLogs();
			await navigator.clipboard.writeText(logsJson);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setCopyError(`Failed to copy logs: ${errorMessage}`);
			console.error("Failed to copy logs:", error);
		}
	};

	const toggleExpanded = (logId: string) => {
		setExpandedLogId(expandedLogId === logId ? null : logId);
	};

	const formatRelativeTime = (date: Date): string => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSecs = Math.floor(diffMs / 1000);

		if (diffSecs < 10) return "just now";
		if (diffSecs < 60) return `${diffSecs}s ago`;

		const diffMins = Math.floor(diffSecs / 60);
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	};

	const getLevelBadgeClass = (level: SyncLog["level"]): string => {
		switch (level) {
			case "success":
				return "debug-log-badge-success";
			case "error":
				return "debug-log-badge-error";
			case "warning":
				return "debug-log-badge-warning";
			case "info":
			default:
				return "debug-log-badge-info";
		}
	};

	const getEventTypeLabel = (eventType: SyncLog["eventType"]): string => {
		switch (eventType) {
			case "syncState":
				return "Sync State";
			case "webSocket":
				return "WebSocket";
			case "persistedState":
				return "Persisted";
			case "syncComplete":
				return "Complete";
			default:
				return eventType;
		}
	};

	return (
		<div className="debug-logs-overlay" onClick={handleOverlayClick}>
			<div className="debug-logs-dialog">
				<div className="debug-logs-header">
					<h2>Debug Logs</h2>
					<button className="debug-logs-close" onClick={onClose}>
						✕
					</button>
				</div>

				<div className="debug-logs-body">
					<div className="debug-logs-info">
						<p>
							Showing last {logs.length} sync events (max 500). Logs are stored
							locally and automatically cleared when limit is reached.
						</p>
					</div>

					<div className="debug-logs-actions">
						<button
							className="debug-logs-btn-secondary"
							onClick={handleCopyLogs}
							disabled={logs.length === 0}
						>
							{copySuccess ? "✓ Copied!" : "Copy All Logs"}
						</button>
						<button
							className="debug-logs-btn-secondary"
							onClick={handleClearAll}
							disabled={logs.length === 0}
						>
							Clear All Logs
						</button>
					</div>

					{(copyError || clearError) && (
						<div
							className="debug-logs-error"
							style={{
								padding: "12px",
								marginTop: "12px",
								backgroundColor: "#fee",
								border: "1px solid #fcc",
								borderRadius: "4px",
								color: "#c00",
							}}
						>
							{copyError && <p style={{ margin: "0 0 8px 0" }}>{copyError}</p>}
							{clearError && <p style={{ margin: 0 }}>{clearError}</p>}
						</div>
					)}

					{logs.length === 0 ? (
						<div className="debug-logs-empty">
							<p>No sync events logged yet.</p>
							<p className="debug-logs-empty-hint">
								Sync events will appear here as they occur.
							</p>
						</div>
					) : (
						<div className="debug-logs-list">
							{logs.map((log) => (
								<div key={log.id} className="debug-log-entry">
									<div
										className="debug-log-entry-header"
										onClick={() => toggleExpanded(log.id)}
									>
										<div className="debug-log-entry-left">
											<span
												className={`debug-log-badge ${getLevelBadgeClass(log.level)}`}
											>
												{log.level}
											</span>
											<span className="debug-log-type">
												{getEventTypeLabel(log.eventType)}
											</span>
										</div>
										<div className="debug-log-entry-right">
											<span
												className="debug-log-time"
												title={log.timestamp.toISOString()}
											>
												{formatRelativeTime(log.timestamp)}
											</span>
											<span className="debug-log-expand-icon">
												{expandedLogId === log.id ? "▼" : "▶"}
											</span>
										</div>
									</div>

									<div className="debug-log-entry-message">{log.message}</div>

									{expandedLogId === log.id && log.data ? (
										<div className="debug-log-entry-details">
											<div className="debug-log-entry-details-label">
												Technical Details:
											</div>
											<pre className="debug-log-entry-details-data">
												{JSON.stringify(log.data, null, 2)}
											</pre>
										</div>
									) : null}
								</div>
							))}
						</div>
					)}
				</div>

				<div className="debug-logs-footer">
					<button className="debug-logs-btn-primary" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

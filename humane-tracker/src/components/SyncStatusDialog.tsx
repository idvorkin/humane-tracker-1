import type { SyncState } from "dexie-cloud-addon";
import { useObservable } from "dexie-react-hooks";
import type React from "react";
import { db } from "../config/db";
import "./SyncStatusDialog.css";

interface SyncStatusDialogProps {
	onClose: () => void;
}

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

function getStatusDisplay(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	hasSyncedBefore: boolean,
): { label: string; className: string; icon: string; hint?: string } {
	if (!syncState) {
		return { label: "Not configured", className: "status-gray", icon: "○" };
	}

	const phase = syncState.phase as SyncStatePhase;

	if (phase === "error" || syncState.status === "error") {
		return { label: "Error", className: "status-red", icon: "●" };
	}
	if (phase === "offline" || syncState.status === "offline") {
		return { label: "Offline", className: "status-gray", icon: "○" };
	}
	if (phase === "pushing") {
		return { label: "Uploading...", className: "status-blue", icon: "↑" };
	}
	if (phase === "pulling") {
		return { label: "Downloading...", className: "status-blue", icon: "↓" };
	}
	if (phase === "in-sync" && wsStatus === "connected") {
		return { label: "Synced (live)", className: "status-green", icon: "●" };
	}
	if (phase === "in-sync") {
		return {
			label: "Synced",
			className: "status-green",
			icon: "●",
			hint: "WebSocket not connected - no live updates",
		};
	}

	// Handle "initial" phase with more context
	if (phase === "initial" || syncState.status === "connecting") {
		// WebSocket stuck connecting but we've synced before
		if (wsStatus === "connecting" && hasSyncedBefore) {
			return {
				label: "WebSocket connecting...",
				className: "status-yellow",
				icon: "○",
				hint: "Data synced via HTTP. WebSocket may be blocked - check domain whitelist.",
			};
		}
		// WebSocket error
		if (wsStatus === "error") {
			return {
				label: "WebSocket failed",
				className: "status-red",
				icon: "●",
				hint: "Live sync unavailable. Check domain whitelist in Dexie Cloud.",
			};
		}
		// First time connecting
		if (!hasSyncedBefore) {
			return {
				label: "First sync...",
				className: "status-yellow",
				icon: "○",
			};
		}
		// Generic connecting
		return { label: "Connecting...", className: "status-yellow", icon: "○" };
	}

	if (syncState.status === "disconnected") {
		return {
			label: "Disconnected",
			className: "status-gray",
			icon: "○",
			hint: wsStatus === "disconnected" ? "WebSocket disconnected" : undefined,
		};
	}

	return { label: syncState.status, className: "status-gray", icon: "○" };
}

function formatTimestamp(date: Date | null | undefined): string {
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
			return "Uploading changes";
		case "pulling":
			return "Downloading changes";
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

function getLicenseLabel(
	license: "ok" | "expired" | "deactivated" | undefined,
): string {
	if (!license) return "Unknown";
	switch (license) {
		case "ok":
			return "OK";
		case "expired":
			return "Expired";
		case "deactivated":
			return "Deactivated";
		default:
			return license;
	}
}

export function SyncStatusDialog({ onClose }: SyncStatusDialogProps) {
	const syncState = useObservable(
		() => db.cloud.syncState,
		[],
	) as SyncState | null;
	const wsStatus = useObservable(
		() => db.cloud.webSocketStatus,
		[],
	) as WebSocketStatus | null;
	const persistedState = useObservable(
		() => db.cloud.persistedSyncState,
		[],
	) as PersistedSyncState | null;

	const lastSynced = persistedState?.timestamp
		? new Date(persistedState.timestamp)
		: null;
	const hasSyncedBefore =
		lastSynced !== null || persistedState?.initiallySynced === true;

	const statusDisplay = getStatusDisplay(syncState, wsStatus, hasSyncedBefore);
	const phase = (syncState?.phase ?? "initial") as SyncStatePhase;
	const progress = syncState?.progress;
	const error = syncState?.error;
	const license = syncState?.license;

	const handleSyncNow = async () => {
		try {
			await db.cloud.sync();
		} catch (err) {
			console.error("Manual sync failed:", err);
		}
	};

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const showProgress = phase === "pushing" || phase === "pulling";
	const showError = phase === "error" || syncState?.status === "error";

	return (
		<div
			className="sync-status-overlay"
			onClick={handleOverlayClick}
			role="dialog"
			aria-modal="true"
			aria-labelledby="sync-status-title"
		>
			<div className="sync-status-dialog">
				<div className="sync-status-header">
					<h2 id="sync-status-title">Sync Status</h2>
					<button
						type="button"
						className="sync-status-close"
						onClick={onClose}
						aria-label="Close dialog"
					>
						✕
					</button>
				</div>

				<div className="sync-status-body">
					<div className={`sync-status-indicator ${statusDisplay.className}`}>
						<span className="sync-status-icon">{statusDisplay.icon}</span>
						<span className="sync-status-label">{statusDisplay.label}</span>
					</div>

					{statusDisplay.hint && (
						<div className="sync-status-hint">{statusDisplay.hint}</div>
					)}

					<div className="sync-status-details">
						<div className="sync-status-row">
							<span className="sync-status-key">Phase:</span>
							<span className="sync-status-value">{getPhaseLabel(phase)}</span>
						</div>
						<div className="sync-status-row">
							<span className="sync-status-key">Last synced:</span>
							<span className="sync-status-value">
								{formatTimestamp(lastSynced)}
							</span>
						</div>
						<div className="sync-status-row">
							<span className="sync-status-key">WebSocket:</span>
							<span className="sync-status-value">
								{getWsStatusLabel(wsStatus)}
							</span>
						</div>
						{license && (
							<div className="sync-status-row">
								<span className="sync-status-key">License:</span>
								<span
									className={`sync-status-value ${license !== "ok" ? "sync-status-warning" : ""}`}
								>
									{getLicenseLabel(license)}
								</span>
							</div>
						)}
					</div>

					{showProgress && (
						<div className="sync-status-progress">
							<div className="sync-status-progress-bar">
								<div
									className="sync-status-progress-fill"
									style={{ width: `${progress ?? 0}%` }}
								/>
							</div>
							<span className="sync-status-progress-text">
								{progress ?? 0}%
							</span>
						</div>
					)}

					{showError && error && (
						<div className="sync-status-error">
							<div className="sync-status-error-title">Error Details</div>
							<div className="sync-status-error-message">
								{error.message || String(error)}
							</div>
						</div>
					)}
				</div>

				<div className="sync-status-footer">
					<button className="sync-status-btn-secondary" onClick={onClose}>
						Close
					</button>
					<button className="sync-status-btn-primary" onClick={handleSyncNow}>
						Sync Now
					</button>
				</div>
			</div>
		</div>
	);
}

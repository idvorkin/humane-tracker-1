import { useObservable } from "dexie-react-hooks";
import type React from "react";
import { db } from "../config/db";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { getModifierKey } from "../services/githubService";
import "./SettingsDialog.css";

interface SettingsDialogProps {
	isLocalMode: boolean;
	onClose: () => void;
	onOpenSyncStatus: () => void;
	onOpenDebugLogs?: () => void;
	onOpenBugReport?: () => void;
	shakeEnabled?: boolean;
	onShakeEnabledChange?: (enabled: boolean) => void;
	shakeSupported?: boolean;
	shakeHasPermission?: boolean;
	onRequestShakePermission?: () => Promise<boolean>;
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

interface SyncState {
	status: string;
	phase: SyncStatePhase;
}

function formatTimeAgo(date: Date | null): string {
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

	const phase = syncState.phase;
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

	return { label: syncState.phase, status: "neutral" };
}

export function SettingsDialog({
	isLocalMode,
	onClose,
	onOpenSyncStatus,
	onOpenDebugLogs,
	onOpenBugReport,
	shakeEnabled = false,
	onShakeEnabledChange,
	shakeSupported = false,
	shakeHasPermission = false,
	onRequestShakePermission,
}: SettingsDialogProps) {
	const { checkForUpdate, isChecking, lastCheckTime } = useVersionCheck();

	const syncStateFromCloud = useObservable(() => db.cloud.syncState, []) as
		| SyncState
		| undefined;
	const wsStatusFromCloud = useObservable(() => db.cloud.webSocketStatus, []) as
		| WebSocketStatus
		| undefined;

	const syncState = isLocalMode ? null : (syncStateFromCloud ?? null);
	const wsStatus = isLocalMode ? null : (wsStatusFromCloud ?? null);
	const syncStatus = getSyncStatusLabel(syncState, wsStatus, isLocalMode);

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleViewSyncDetails = () => {
		onClose();
		onOpenSyncStatus();
	};

	const handleViewDebugLogs = () => {
		onClose();
		onOpenDebugLogs?.();
	};

	return (
		<div className="settings-dialog-overlay" onClick={handleOverlayClick}>
			<div className="settings-dialog">
				<div className="settings-dialog-header">
					<h2>Settings</h2>
					<button className="settings-dialog-close" onClick={onClose}>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M5 5l10 10M15 5L5 15" />
						</svg>
					</button>
				</div>

				<div className="settings-dialog-body">
					{/* Updates Section */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon">
								<svg
									width="18"
									height="18"
									viewBox="0 0 18 18"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<path d="M9 1v4M9 13v4M1 9h4M13 9h4" />
									<circle cx="9" cy="9" r="4" />
								</svg>
							</div>
							<span className="settings-section-title">App Updates</span>
						</div>
						<div className="settings-section-content">
							<div className="settings-info-row">
								<span className="settings-info-label">Last checked</span>
								<span className="settings-info-value">
									{formatTimeAgo(lastCheckTime)}
								</span>
							</div>
							<button
								className="settings-action-button"
								onClick={checkForUpdate}
								disabled={isChecking}
							>
								{isChecking ? (
									<>
										<span className="settings-button-spinner" />
										Checking...
									</>
								) : (
									"Check for Update"
								)}
							</button>
						</div>
					</div>

					{/* Sync Section */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon">
								<svg
									width="18"
									height="18"
									viewBox="0 0 18 18"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<path d="M1 9a8 8 0 0114.9-4M17 9a8 8 0 01-14.9 4" />
									<path d="M1 5V9h4M17 13V9h-4" />
								</svg>
							</div>
							<span className="settings-section-title">Cloud Sync</span>
						</div>
						<div className="settings-section-content">
							<div className="settings-info-row">
								<span className="settings-info-label">Status</span>
								<span
									className={`settings-status-badge settings-status-${syncStatus.status}`}
								>
									<span className="settings-status-dot" />
									{syncStatus.label}
								</span>
							</div>
							<button
								className="settings-action-button settings-action-secondary"
								onClick={handleViewSyncDetails}
							>
								View Sync Details
							</button>
							<button
								className="settings-action-button settings-action-secondary"
								onClick={handleViewDebugLogs}
							>
								View Debug Logs
							</button>
						</div>
					</div>

					{/* Help & Feedback Section */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon">
								<svg
									width="18"
									height="18"
									viewBox="0 0 18 18"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<path d="M9 1.5a5.5 5.5 0 015.5 5.5v1h2v2h-2v1a5.5 5.5 0 01-11 0v-1h-2V8h2V7A5.5 5.5 0 019 1.5z" />
									<path d="M7 8h4M7 11h4" />
								</svg>
							</div>
							<span className="settings-section-title">Help & Feedback</span>
						</div>
						<div className="settings-section-content">
							{onOpenBugReport && (
								<button
									className="settings-action-button"
									onClick={() => {
										onClose();
										onOpenBugReport();
									}}
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
									>
										<path d="M8 1.5a4 4 0 014 4v1h1.5v1.5H12v1a4 4 0 01-8 0v-1H2.5V6.5H4v-1a4 4 0 014-4z" />
										<path d="M6.5 6.5h3M6.5 9h3" />
									</svg>
									Report a Bug
								</button>
							)}
							{shakeSupported && onShakeEnabledChange && (
								<div className="settings-toggle-row">
									<span
										id="shake-toggle-label"
										className="settings-toggle-label"
									>
										Shake to Report Bug
									</span>
									<button
										type="button"
										role="switch"
										aria-checked={shakeEnabled}
										aria-labelledby="shake-toggle-label"
										className={`settings-toggle ${shakeEnabled ? "settings-toggle-on" : ""}`}
										onClick={async () => {
											try {
												if (!shakeEnabled && !shakeHasPermission) {
													// Request permission first
													const granted = await onRequestShakePermission?.();
													if (granted) {
														onShakeEnabledChange(true);
													}
												} else {
													onShakeEnabledChange(!shakeEnabled);
												}
											} catch (err) {
												console.error("Failed to toggle shake setting:", err);
											}
										}}
									>
										<span className="settings-toggle-thumb" />
									</button>
								</div>
							)}
							<div className="settings-info-row">
								<span className="settings-info-label">Keyboard shortcut</span>
								<span className="settings-info-value">
									{getModifierKey()}+I
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="settings-dialog-footer">
					<button className="settings-done-button" onClick={onClose}>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}

import { useLiveQuery, useObservable } from "dexie-react-hooks";
import type React from "react";
import { useState } from "react";
import { db, syncLogService } from "../config/db";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { getModifierKey } from "../services/githubService";
import {
	computeSyncStatus,
	formatTimeAgo,
	getDetailedSyncInfo,
	type SyncState,
	type WebSocketStatus,
} from "../services/syncStatusService";
import type { SyncLog } from "../types/syncLog";
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

interface PersistedSyncState {
	timestamp?: Date;
	serverRevision?: unknown;
	initiallySynced?: boolean;
}

function ConnectionQualityIndicator({
	quality,
	label,
}: {
	quality: "good" | "fair" | "poor" | "none";
	label: string;
}) {
	const barCount = 4;
	const activeBars = {
		good: 4,
		fair: 2,
		poor: 1,
		none: 0,
	}[quality];

	return (
		<div className={`settings-connection-quality ${quality}`}>
			<div className="settings-connection-bars">
				{Array.from({ length: barCount }).map((_, i) => (
					<div
						key={i}
						className={`settings-connection-bar ${i < activeBars ? "active" : ""}`}
						style={{ height: `${((i + 1) / barCount) * 100}%` }}
					/>
				))}
			</div>
			<span>{label}</span>
		</div>
	);
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

	// Expandable sections state
	const [detailsExpanded, setDetailsExpanded] = useState(false);
	const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);

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

	// Recent logs for diagnostics (live query)
	const recentLogs = useLiveQuery(
		() => syncLogService.getRecentLogs(5),
		[],
	) as SyncLog[] | undefined;

	const syncState = isLocalMode ? null : (syncStateFromCloud ?? null);
	const wsStatus = isLocalMode ? null : (wsStatusFromCloud ?? null);

	const lastSynced = persistedState?.timestamp
		? new Date(persistedState.timestamp)
		: null;
	const hasSyncedBefore =
		lastSynced !== null || persistedState?.initiallySynced === true;

	const syncStatus = computeSyncStatus(
		syncState,
		wsStatus,
		isLocalMode,
		hasSyncedBefore,
	);
	const detailedInfo = getDetailedSyncInfo(syncState, wsStatus);

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

	const handleSyncNow = async () => {
		try {
			await db.cloud.sync();
		} catch (err) {
			console.error("Manual sync failed:", err);
		}
	};

	const handleExportDiagnostics = async () => {
		try {
			const diagnostics = await syncLogService.exportDiagnostics(
				syncState,
				wsStatus,
				persistedState,
			);
			const blob = new Blob([diagnostics], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const filename = `humane-tracker-diagnostics-${timestamp}.json`;

			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to export diagnostics:", error);
		}
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

					{/* Sync Section with Expandable Details */}
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
									className={`settings-status-badge settings-status-${syncStatus.badgeStatus}`}
								>
									<span className="settings-status-dot" />
									{syncStatus.label}
								</span>
							</div>

							{/* Expandable Details Section */}
							{!isLocalMode && (
								<div className="settings-expandable">
									<div
										className="settings-expandable-header"
										onClick={() => setDetailsExpanded(!detailsExpanded)}
									>
										<span className="settings-expandable-title">Details</span>
										<span
											className={`settings-expandable-icon ${detailsExpanded ? "expanded" : ""}`}
										>
											▼
										</span>
									</div>
									<div
										className={`settings-expandable-content ${detailsExpanded ? "expanded" : ""}`}
									>
										<div className="settings-expandable-body">
											<div className="settings-sync-detail-row">
												<span className="settings-sync-detail-label">
													Current activity
												</span>
												<span className="settings-sync-detail-value">
													{detailedInfo.phaseLabel}
												</span>
											</div>
											<div className="settings-sync-detail-row">
												<span className="settings-sync-detail-label">
													Last synced
												</span>
												<span className="settings-sync-detail-value">
													{formatTimeAgo(lastSynced)}
												</span>
											</div>
											<div className="settings-sync-detail-row">
												<span className="settings-sync-detail-label">
													Connection
												</span>
												<span className="settings-sync-detail-value">
													<ConnectionQualityIndicator
														quality={detailedInfo.connectionQuality}
														label={detailedInfo.connectionLabel}
													/>
												</span>
											</div>
											<button
												className="settings-action-button"
												onClick={handleSyncNow}
												style={{ marginTop: "8px" }}
											>
												Sync Now
											</button>
										</div>
									</div>
								</div>
							)}

							{/* Expandable Advanced Diagnostics Section */}
							{!isLocalMode && (
								<div className="settings-expandable">
									<div
										className="settings-expandable-header"
										onClick={() => setDiagnosticsExpanded(!diagnosticsExpanded)}
									>
										<span className="settings-expandable-title">
											Advanced Diagnostics
										</span>
										<span
											className={`settings-expandable-icon ${diagnosticsExpanded ? "expanded" : ""}`}
										>
											▼
										</span>
									</div>
									<div
										className={`settings-expandable-content ${diagnosticsExpanded ? "expanded" : ""}`}
									>
										<div className="settings-expandable-body">
											<div className="settings-recent-logs">
												{recentLogs && recentLogs.length > 0 ? (
													recentLogs.map((log) => (
														<div
															key={log.id}
															className="settings-recent-log-entry"
														>
															<div className="settings-recent-log-header">
																<span
																	className={`settings-recent-log-badge ${log.level}`}
																>
																	{log.level}
																</span>
																<span className="settings-recent-log-time">
																	{formatTimeAgo(log.timestamp)}
																</span>
															</div>
															<div className="settings-recent-log-message">
																{log.message}
															</div>
														</div>
													))
												) : (
													<div className="settings-recent-logs-empty">
														No recent sync events
													</div>
												)}
											</div>
											<div className="settings-button-row" style={{ marginTop: "12px" }}>
												<button
													className="settings-action-button settings-action-secondary"
													onClick={handleViewDebugLogs}
												>
													View Full Log
												</button>
												<button
													className="settings-action-button settings-action-secondary"
													onClick={handleExportDiagnostics}
												>
													Export for Support
												</button>
											</div>
										</div>
									</div>
								</div>
							)}
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

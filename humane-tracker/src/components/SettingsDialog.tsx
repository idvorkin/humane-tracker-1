import { useObservable } from "dexie-react-hooks";
import type React from "react";
import { useRef, useState } from "react";
import { db } from "../config/db";
import { useVersionCheck } from "../hooks/useVersionCheck";
import {
	type ExportData,
	exportAllData,
	importAllData,
	validateExportData,
} from "../services/dataService";
import "./SettingsDialog.css";

interface SettingsDialogProps {
	isLocalMode: boolean;
	onClose: () => void;
	onOpenSyncStatus: () => void;
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
}: SettingsDialogProps) {
	const { checkForUpdate, isChecking, lastCheckTime } = useVersionCheck();
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importStatus, setImportStatus] = useState<string | null>(null);
	const [pendingImportData, setPendingImportData] = useState<ExportData | null>(
		null,
	);
	const [showImportConfirm, setShowImportConfirm] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const handleExport = async () => {
		setIsExporting(true);
		setImportStatus(null);
		try {
			const data = await exportAllData();
			const json = JSON.stringify(data, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `humane-tracker-backup-${new Date().toISOString().split("T")[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			setImportStatus(
				`Exported ${data.habits.length} habits and ${data.entries.length} entries`,
			);
		} catch (error) {
			console.error("Export failed:", error);
			setImportStatus("Export failed. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setImportStatus(null);
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);

			// Validate the data structure
			if (!validateExportData(parsed)) {
				throw new Error("Invalid backup file format");
			}

			// Store the data and show confirmation dialog
			setPendingImportData(parsed);
			setShowImportConfirm(true);
		} catch (error) {
			console.error("Import failed:", error);
			setImportStatus(
				error instanceof SyntaxError
					? "Invalid JSON file"
					: "Import failed. Please check the file format.",
			);
		} finally {
			// Reset the input so the same file can be selected again
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleImportConfirm = async (mode: "merge" | "replace") => {
		if (!pendingImportData) return;

		setIsImporting(true);
		setShowImportConfirm(false);
		try {
			const result = await importAllData(pendingImportData, mode);
			const modeLabel =
				mode === "replace" ? "Replaced all data with" : "Merged";
			setImportStatus(
				`${modeLabel} ${result.habitsImported} habits and ${result.entriesImported} entries`,
			);
		} catch (error) {
			console.error("Import failed:", error);
			setImportStatus("Import failed. Please try again.");
		} finally {
			setIsImporting(false);
			setPendingImportData(null);
		}
	};

	const handleImportCancel = () => {
		setShowImportConfirm(false);
		setPendingImportData(null);
	};

	return (
		<div className="settings-dialog-overlay" onClick={handleOverlayClick}>
			{showImportConfirm && pendingImportData && (
				<div className="settings-dialog import-confirm-dialog">
					<div className="settings-dialog-header">
						<h2>Import Data</h2>
						<button
							className="settings-dialog-close"
							onClick={handleImportCancel}
						>
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
						<div className="import-confirm-info">
							<p>
								Found <strong>{pendingImportData.habits.length}</strong> habits
								and <strong>{pendingImportData.entries.length}</strong> entries
							</p>
							<p className="import-confirm-date">
								Backup from{" "}
								{new Date(pendingImportData.exportedAt).toLocaleDateString()}
							</p>
						</div>
						<div className="import-confirm-options">
							<button
								className="settings-action-button"
								onClick={() => handleImportConfirm("merge")}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<path d="M8 2v12M2 8h12" />
								</svg>
								Merge with Existing
							</button>
							<p className="import-option-desc">
								Add new items, update existing ones
							</p>
							<button
								className="settings-action-button settings-action-danger"
								onClick={() => handleImportConfirm("replace")}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<path d="M2 4h12M5 4V2h6v2M6 7v6M10 7v6M3 4v10h10V4" />
								</svg>
								Replace All Data
							</button>
							<p className="import-option-desc import-option-warning">
								Delete everything and restore from backup
							</p>
						</div>
					</div>
					<div className="settings-dialog-footer">
						<button
							className="settings-done-button"
							onClick={handleImportCancel}
						>
							Cancel
						</button>
					</div>
				</div>
			)}
			<div
				className="settings-dialog"
				style={{ display: showImportConfirm ? "none" : undefined }}
			>
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
							{!isLocalMode && (
								<button
									className="settings-action-button settings-action-secondary"
									onClick={handleViewSyncDetails}
								>
									View Sync Details
								</button>
							)}
						</div>
					</div>

					{/* Data Management Section */}
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
									<path d="M2 5h14M2 9h14M2 13h14" />
									<circle cx="5" cy="5" r="1" fill="currentColor" />
									<circle cx="5" cy="9" r="1" fill="currentColor" />
									<circle cx="5" cy="13" r="1" fill="currentColor" />
								</svg>
							</div>
							<span className="settings-section-title">Data Management</span>
						</div>
						<div className="settings-section-content">
							<input
								type="file"
								ref={fileInputRef}
								accept=".json"
								onChange={handleFileChange}
								style={{ display: "none" }}
							/>
							<div className="settings-button-row">
								<button
									className="settings-action-button"
									onClick={handleExport}
									disabled={isExporting}
								>
									{isExporting ? (
										<>
											<span className="settings-button-spinner" />
											Exporting...
										</>
									) : (
										<>
											<svg
												width="16"
												height="16"
												viewBox="0 0 16 16"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.5"
											>
												<path d="M8 2v9M4 7l4 4 4-4" />
												<path d="M2 12v2h12v-2" />
											</svg>
											Export
										</>
									)}
								</button>
								<button
									className="settings-action-button settings-action-secondary"
									onClick={handleImportClick}
									disabled={isImporting}
								>
									{isImporting ? (
										<>
											<span className="settings-button-spinner" />
											Importing...
										</>
									) : (
										<>
											<svg
												width="16"
												height="16"
												viewBox="0 0 16 16"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.5"
											>
												<path d="M8 11V2M4 6l4-4 4 4" />
												<path d="M2 12v2h12v-2" />
											</svg>
											Import
										</>
									)}
								</button>
							</div>
							{importStatus && (
								<div className="settings-info-row">
									<span className="settings-info-value">{importStatus}</span>
								</div>
							)}
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

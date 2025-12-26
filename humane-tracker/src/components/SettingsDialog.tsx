import type React from "react";
import { useEffect, useState } from "react";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import { getModifierKey } from "../services/githubService";
import { AboutSection } from "./AboutSection";
import { CrashTestButton } from "./CrashTestButton";
import {
	BugIcon,
	CloseIcon,
	StorageIcon,
	UpdateIcon,
	WarningIcon,
} from "./icons/MenuIcons";
import { SyncSection } from "./SyncSection";
import "./SettingsDialog.css";

interface SettingsDialogProps {
	isLocalMode: boolean;
	userId: string;
	onClose: () => void;
	onOpenBugReport?: () => void;
	shakeEnabled?: boolean;
	onShakeEnabledChange?: (enabled: boolean) => void;
	shakeSupported?: boolean;
	shakeHasPermission?: boolean;
	onRequestShakePermission?: () => Promise<boolean>;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
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

export function SettingsDialog({
	isLocalMode,
	userId,
	onClose,
	onOpenBugReport,
	shakeEnabled = false,
	onShakeEnabledChange,
	shakeSupported = false,
	shakeHasPermission = false,
	onRequestShakePermission,
}: SettingsDialogProps) {
	const { checkForUpdate, isChecking, lastCheckTime } = useVersionCheck();
	const [audioStorageSize, setAudioStorageSize] = useState<number | null>(null);

	useEffect(() => {
		audioRecordingRepository
			.getTotalSizeForUser(userId)
			.then(setAudioStorageSize)
			.catch(() => setAudioStorageSize(null));
	}, [userId]);

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className="settings-dialog-overlay" onClick={handleOverlayClick}>
			<div className="settings-dialog">
				<div className="settings-dialog-header">
					<h2>Settings</h2>
					<button className="settings-dialog-close" onClick={onClose}>
						<CloseIcon />
					</button>
				</div>

				<div className="settings-dialog-body">
					{/* About Section */}
					<AboutSection />

					{/* Updates Section */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon">
								<UpdateIcon />
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

					{/* Sync Section with expandable details and logs */}
					<SyncSection isLocalMode={isLocalMode} />

					{/* Storage Section */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon">
								<StorageIcon />
							</div>
							<span className="settings-section-title">Storage</span>
						</div>
						<div className="settings-section-content">
							<div className="settings-info-row">
								<span className="settings-info-label">Audio recordings</span>
								<span className="settings-info-value">
									{audioStorageSize !== null
										? formatBytes(audioStorageSize)
										: "—"}
								</span>
							</div>
						</div>
					</div>

					{/* Help & Feedback Section */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon">
								<BugIcon size={18} />
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
									<BugIcon />
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

					{/* Developer Tools Section (dev mode only) */}
					{import.meta.env.DEV && (
						<div className="settings-section">
							<div className="settings-section-header">
								<div className="settings-section-icon settings-section-icon-warning">
									<WarningIcon />
								</div>
								<span className="settings-section-title">Developer Tools</span>
							</div>
							<div className="settings-section-content">
								<CrashTestButton className="settings-action-button settings-action-danger" />
							</div>
						</div>
					)}
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

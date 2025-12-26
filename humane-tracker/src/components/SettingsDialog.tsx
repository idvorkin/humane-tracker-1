import type React from "react";
import { getModifierKey } from "../services/githubService";
import { AboutSection } from "./AboutSection";
import { CrashTestButton } from "./CrashTestButton";
import { SyncDebugSection } from "./SyncDebugSection";
import { BugIcon, CloseIcon, WarningIcon } from "./icons/MenuIcons";
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
					{/* About Section - now includes app updates, sync status, storage */}
					<AboutSection isLocalMode={isLocalMode} userId={userId} />

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
								<span className="settings-info-value">{getModifierKey()}+I</span>
							</div>
						</div>
					</div>

					{/* Developer Tools Section - now always visible */}
					<div className="settings-section">
						<div className="settings-section-header">
							<div className="settings-section-icon settings-section-icon-warning">
								<WarningIcon />
							</div>
							<span className="settings-section-title">Developer Tools</span>
						</div>
						<div className="settings-section-content">
							{import.meta.env.DEV && (
								<CrashTestButton className="settings-action-button settings-action-danger" />
							)}
							<SyncDebugSection isLocalMode={isLocalMode} />
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

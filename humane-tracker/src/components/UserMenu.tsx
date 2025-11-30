import React, { useEffect, useRef, useState } from "react";
import { useBugReporter } from "../hooks/useBugReporter";
import { AboutDialog } from "./AboutDialog";
import { BugReportDialog } from "./BugReportDialog";
import { CrashTestButton } from "./CrashTestButton";
import { DebugLogsDialog } from "./DebugLogsDialog";
import { SettingsDialog } from "./SettingsDialog";
import { SyncStatusDialog } from "./SyncStatusDialog";
import "./UserMenu.css";

interface UserMenuProps {
	userName: string;
	avatarLetter: string;
	isLocalMode?: boolean;
	onSignOut: () => void;
	onManageHabits?: () => void;
	onLoadDefaults?: () => void;
	showLoadDefaults?: boolean;
}

export function UserMenu({
	userName,
	avatarLetter,
	isLocalMode = false,
	onSignOut,
	onManageHabits,
	onLoadDefaults,
	showLoadDefaults = false,
}: UserMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const [showSyncDialog, setShowSyncDialog] = useState(false);
	const [showDebugLogsDialog, setShowDebugLogsDialog] = useState(false);
	const [showAboutDialog, setShowAboutDialog] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Bug reporter state
	const bugReporter = useBugReporter();

	// Close menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Close menu on escape key
	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	return (
		<div className="user-menu" ref={menuRef}>
			<button
				className="user-menu-trigger"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<div className="user-avatar">{avatarLetter}</div>
				<svg
					className={`user-menu-chevron ${isOpen ? "open" : ""}`}
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{isOpen && (
				<div className="user-menu-dropdown">
					<div className="user-menu-header">
						<span className="user-menu-name">{userName}</span>
						{isLocalMode && <span className="user-menu-badge">Local Mode</span>}
					</div>

					<div className="user-menu-divider" />

					{onManageHabits && (
						<button
							className="user-menu-item"
							onClick={() => {
								setIsOpen(false);
								onManageHabits();
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
								<circle cx="8" cy="8" r="3" />
								<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
							</svg>
							Manage Habits
						</button>
					)}

					{showLoadDefaults && onLoadDefaults && (
						<button
							className="user-menu-item"
							onClick={() => {
								setIsOpen(false);
								onLoadDefaults();
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
								<path d="M8 1v10M4 7l4 4 4-4M2 14h12" />
							</svg>
							Load Default Habits
						</button>
					)}

					<div className="user-menu-divider" />

					<button
						className="user-menu-item"
						onClick={() => {
							setShowAboutDialog(true);
							setIsOpen(false);
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
							<circle cx="8" cy="8" r="6" />
							<path d="M8 11V8M8 5h.01" />
						</svg>
						About
					</button>

					<button
						className="user-menu-item"
						onClick={() => {
							setIsOpen(false);
							bugReporter.open();
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
						Report Bug
					</button>

					<button
						className="user-menu-item"
						onClick={() => {
							setShowSettingsDialog(true);
							setIsOpen(false);
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
							<circle cx="8" cy="8" r="2.5" />
							<path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.17 3.17l1.06 1.06M11.77 11.77l1.06 1.06M3.17 12.83l1.06-1.06M11.77 4.23l1.06-1.06" />
						</svg>
						Settings
					</button>

					<CrashTestButton />

					<div className="user-menu-divider" />

					<button
						className="user-menu-item user-menu-signout"
						onClick={() => {
							setIsOpen(false);
							onSignOut();
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
							<path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" />
						</svg>
						{isLocalMode ? "Reset" : "Sign Out"}
					</button>
				</div>
			)}

			{showSettingsDialog && (
				<SettingsDialog
					isLocalMode={isLocalMode}
					onClose={() => setShowSettingsDialog(false)}
					onOpenSyncStatus={() => setShowSyncDialog(true)}
					onOpenDebugLogs={() => setShowDebugLogsDialog(true)}
					onOpenBugReport={bugReporter.open}
					shakeEnabled={bugReporter.shakeEnabled}
					onShakeEnabledChange={bugReporter.setShakeEnabled}
					shakeSupported={bugReporter.shakeSupported}
					shakeHasPermission={bugReporter.shakeHasPermission}
					onRequestShakePermission={bugReporter.requestShakePermission}
				/>
			)}

			<AboutDialog
				isOpen={showAboutDialog}
				onClose={() => setShowAboutDialog(false)}
			/>

			{showSyncDialog && (
				<SyncStatusDialog onClose={() => setShowSyncDialog(false)} />
			)}

			{showDebugLogsDialog && (
				<DebugLogsDialog onClose={() => setShowDebugLogsDialog(false)} />
			)}

			<BugReportDialog
				isOpen={bugReporter.isOpen}
				onClose={bugReporter.close}
				title={bugReporter.title}
				setTitle={bugReporter.setTitle}
				description={bugReporter.description}
				setDescription={bugReporter.setDescription}
				includeMetadata={bugReporter.includeMetadata}
				setIncludeMetadata={bugReporter.setIncludeMetadata}
				screenshot={bugReporter.screenshot}
				isCapturingScreenshot={bugReporter.isCapturingScreenshot}
				onCaptureScreenshot={bugReporter.captureScreenshot}
				onClearScreenshot={bugReporter.clearScreenshot}
				screenshotSupported={bugReporter.screenshotSupported}
				isMobile={bugReporter.isMobile}
				isSubmitting={bugReporter.isSubmitting}
				onSubmit={bugReporter.submit}
				error={bugReporter.error}
			/>
		</div>
	);
}

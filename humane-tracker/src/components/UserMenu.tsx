import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBugReporter } from "../hooks/useBugReporter";
import { BugReportDialog } from "./BugReportDialog";
import {
	ChevronIcon,
	DownloadIcon,
	ManageHabitsIcon,
	MicrophoneIcon,
	SettingsIcon,
	SignInIcon,
	SignOutIcon,
} from "./icons/MenuIcons";
import { MenuItem } from "./MenuItem";
import { SettingsDialog } from "./SettingsDialog";
import "./UserMenu.css";

interface UserMenuProps {
	userName: string;
	avatarLetter: string;
	isLocalMode?: boolean;
	onSignOut?: () => void;
	onSignIn?: () => void;
	onManageHabits?: () => void;
	onLoadDefaults?: () => void;
	showLoadDefaults?: boolean;
}

export function UserMenu({
	userName,
	avatarLetter,
	isLocalMode = false,
	onSignOut,
	onSignIn,
	onManageHabits,
	onLoadDefaults,
	showLoadDefaults = false,
}: UserMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Bug reporter state (needed for keyboard shortcut Cmd+I and BugReportDialog)
	const bugReporter = useBugReporter();

	const closeMenu = () => setIsOpen(false);

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
				<ChevronIcon className={`user-menu-chevron ${isOpen ? "open" : ""}`} />
			</button>

			{isOpen && (
				<div className="user-menu-dropdown">
					<div className="user-menu-header">
						<span className="user-menu-name">{userName}</span>
						{isLocalMode && <span className="user-menu-badge">Local Mode</span>}
					</div>

					<div className="user-menu-divider" />

					{onManageHabits && (
						<div className="user-menu-group">
							<MenuItem
								icon={<ManageHabitsIcon />}
								label="Manage Habits"
								onClick={() => {
									closeMenu();
									onManageHabits();
								}}
							/>
							{showLoadDefaults && onLoadDefaults && (
								<MenuItem
									icon={<DownloadIcon />}
									label="Load Default Habits"
									onClick={() => {
										closeMenu();
										onLoadDefaults();
									}}
									className="user-menu-subitem"
								/>
							)}
						</div>
					)}

					<Link to="/recordings" className="user-menu-link" onClick={closeMenu}>
						<MenuItem
							icon={<MicrophoneIcon />}
							label="Recordings"
							onClick={() => {
								/* Link handles navigation */
							}}
						/>
					</Link>

					<div className="user-menu-divider" />

					<MenuItem
						icon={<SettingsIcon />}
						label="Settings"
						onClick={() => {
							closeMenu();
							setShowSettingsDialog(true);
						}}
					/>

					<div className="user-menu-divider" />

					{onSignIn ? (
						<MenuItem
							icon={<SignInIcon />}
							label="Sign In"
							onClick={() => {
								closeMenu();
								onSignIn();
							}}
						/>
					) : onSignOut ? (
						<MenuItem
							icon={<SignOutIcon />}
							label={isLocalMode ? "Reset" : "Sign Out"}
							onClick={() => {
								closeMenu();
								onSignOut();
							}}
							variant="danger"
						/>
					) : null}
				</div>
			)}

			{showSettingsDialog && (
				<SettingsDialog
					isLocalMode={isLocalMode}
					onClose={() => setShowSettingsDialog(false)}
					onOpenBugReport={bugReporter.open}
					shakeEnabled={bugReporter.shakeEnabled}
					onShakeEnabledChange={bugReporter.setShakeEnabled}
					shakeSupported={bugReporter.shakeSupported}
					shakeHasPermission={bugReporter.shakeHasPermission}
					onRequestShakePermission={bugReporter.requestShakePermission}
				/>
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

import React, { useEffect, useRef, useState } from "react";
import "./UserMenu.css";

interface UserMenuProps {
	userName: string;
	avatarLetter: string;
	isLocalMode?: boolean;
	onSignOut: () => void;
	onManageHabits?: () => void;
	onCleanDuplicates?: () => void;
	onLoadDefaults?: () => void;
	showCleanDuplicates?: boolean;
	showLoadDefaults?: boolean;
}

export function UserMenu({
	userName,
	avatarLetter,
	isLocalMode = false,
	onSignOut,
	onManageHabits,
	onCleanDuplicates,
	onLoadDefaults,
	showCleanDuplicates = false,
	showLoadDefaults = false,
}: UserMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

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

					{showCleanDuplicates && onCleanDuplicates && (
						<button
							className="user-menu-item user-menu-danger"
							onClick={() => {
								setIsOpen(false);
								onCleanDuplicates();
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
								<path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
							</svg>
							Clean Duplicates
						</button>
					)}

					<div className="user-menu-divider" />

					<a
						href="https://github.com/idvorkin/humane-tracker-1"
						target="_blank"
						rel="noopener noreferrer"
						className="user-menu-item"
						onClick={() => setIsOpen(false)}
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
						</svg>
						GitHub
					</a>

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
		</div>
	);
}

import type React from "react";
import { getBuildInfo, getGitHubLinks } from "../services/githubService";
import "./AboutDialog.css";

interface AboutDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
	if (!isOpen) return null;

	const buildInfo = getBuildInfo();
	const links = getGitHubLinks();

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const formatTimestamp = (timestamp: string): string => {
		if (!timestamp) return "";
		try {
			return new Date(timestamp).toLocaleString();
		} catch {
			return timestamp;
		}
	};

	return (
		<div className="about-dialog-overlay" onClick={handleOverlayClick}>
			<div className="about-dialog">
				<div className="about-dialog-header">
					<div className="about-dialog-header-content">
						<div className="about-dialog-icon">
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4M12 8h.01" />
							</svg>
						</div>
						<h2>About</h2>
					</div>
					<button
						className="about-dialog-close"
						onClick={onClose}
						aria-label="Close"
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

				<div className="about-dialog-body">
					<div className="about-app-title">
						<h3 className="about-app-name">Humane Tracker</h3>
						<p className="about-app-tagline">
							Track habits with a humane, local-first approach
						</p>
					</div>

					<div className="about-info-row">
						<span className="about-info-label">Build</span>
						<span className="about-info-value">
							<a
								href={buildInfo.commitUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								{buildInfo.sha.slice(0, 7)}
							</a>
						</span>
					</div>

					<div className="about-info-row">
						<span className="about-info-label">Branch</span>
						<span className="about-info-value">{buildInfo.branch}</span>
					</div>

					{buildInfo.timestamp && (
						<div className="about-info-row">
							<span className="about-info-label">Built</span>
							<span className="about-info-value">
								{formatTimestamp(buildInfo.timestamp)}
							</span>
						</div>
					)}

					<div className="about-links">
						<a
							href={links.repo}
							target="_blank"
							rel="noopener noreferrer"
							className="about-link"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
							</svg>
							View on GitHub
						</a>
					</div>
				</div>

				<div className="about-dialog-footer">
					<button className="about-done-button" onClick={onClose}>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}

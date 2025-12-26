import { getBuildInfo, getGitHubLinks } from "../services/githubService";
import { GitHubIcon, InfoIcon } from "./icons/MenuIcons";

function formatTimestamp(timestamp: string): string {
	if (!timestamp) return "";
	try {
		return new Date(timestamp).toLocaleString();
	} catch {
		return timestamp;
	}
}

async function shareOrCopyUrl(): Promise<void> {
	const url = window.location.origin;

	// Try Web Share API first (works on mobile)
	if (navigator.share) {
		try {
			await navigator.share({
				title: "Humane Tracker",
				url,
			});
			return;
		} catch (err) {
			// User cancelled or share failed, fall through to clipboard
			if ((err as Error).name === "AbortError") return;
		}
	}

	// Fallback: copy to clipboard
	try {
		await navigator.clipboard.writeText(url);
		alert("URL copied to clipboard!");
	} catch {
		// Last resort: prompt user to copy manually
		prompt("Copy this URL:", url);
	}
}

export function AboutSection() {
	const buildInfo = getBuildInfo();
	const links = getGitHubLinks();

	return (
		<div className="settings-section">
			<div className="settings-section-header">
				<div className="settings-section-icon">
					<InfoIcon size={18} />
				</div>
				<span className="settings-section-title">About</span>
			</div>
			<div className="settings-section-content">
				<div className="about-section-title">
					<h3 className="about-section-name">Humane Tracker</h3>
					<p className="about-section-tagline">
						Track habits with a humane, local-first approach
					</p>
				</div>

				<div className="settings-info-row">
					<span className="settings-info-label">Build</span>
					<span className="settings-info-value">
						<a
							href={buildInfo.commitUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="about-section-link"
						>
							{buildInfo.sha.slice(0, 7)}
						</a>
					</span>
				</div>

				<div className="settings-info-row">
					<span className="settings-info-label">Branch</span>
					<span className="settings-info-value">{buildInfo.branch}</span>
				</div>

				{buildInfo.timestamp && (
					<div className="settings-info-row">
						<span className="settings-info-label">Built</span>
						<span className="settings-info-value">
							{formatTimestamp(buildInfo.timestamp)}
						</span>
					</div>
				)}

				<div className="settings-info-row">
					<span className="settings-info-label">URL</span>
					<button
						type="button"
						onClick={shareOrCopyUrl}
						className="about-section-url-button"
					>
						{window.location.origin}
					</button>
				</div>

				<a
					href={links.repo}
					target="_blank"
					rel="noopener noreferrer"
					className="settings-action-button settings-action-secondary about-section-github"
				>
					<GitHubIcon size={16} />
					View on GitHub
				</a>
			</div>
		</div>
	);
}

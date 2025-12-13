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

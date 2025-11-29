/**
 * GitHub Integration Service
 * Provides utilities for GitHub repository links and issue creation
 */

// Default repository URL - can be overridden via environment variable
const DEFAULT_REPO_URL = "https://github.com/idvorkin/humane-tracker-1";

export interface GitHubLinks {
	repo: string;
	issues: string;
	newIssue: string;
}

export interface CommitInfo {
	sha: string;
	message: string;
	url: string;
}

export interface BugReportData {
	title: string;
	description: string;
	includeMetadata: boolean;
}

/**
 * Get the GitHub repository URL from environment or default
 */
export function getRepoUrl(): string {
	// Check for environment variable override (set at build time via Vite)
	if (
		typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_GITHUB_REPO_URL
	) {
		return import.meta.env.VITE_GITHUB_REPO_URL;
	}
	return DEFAULT_REPO_URL;
}

/**
 * Generate GitHub links from a repository URL
 */
export function getGitHubLinks(repoUrl: string = getRepoUrl()): GitHubLinks {
	const base = repoUrl.replace(/\.git$/, "");
	return {
		repo: base,
		issues: `${base}/issues`,
		newIssue: `${base}/issues/new`,
	};
}

/**
 * Fetch the latest commit from the repository
 */
export async function fetchLatestCommit(
	repoUrl: string = getRepoUrl(),
): Promise<CommitInfo | null> {
	const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
	if (!match) return null;

	const [, owner, repo] = match;
	const cleanRepo = repo.replace(/\.git$/, "");

	try {
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=1`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
			},
		);

		if (!response.ok) return null;

		const commits = await response.json();
		if (!commits || commits.length === 0) return null;

		return {
			sha: commits[0].sha.substring(0, 7),
			message: commits[0].commit.message.split("\n")[0],
			url: commits[0].html_url,
		};
	} catch (error) {
		console.error("Failed to fetch latest commit:", error);
		return null;
	}
}

/**
 * Get browser and device information for bug reports
 */
export function getDeviceInfo(): string {
	const ua = navigator.userAgent;
	const platform = navigator.platform || "Unknown platform";
	const language = navigator.language || "Unknown language";
	const screenSize = `${window.screen.width}x${window.screen.height}`;
	const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
	const online = navigator.onLine ? "Online" : "Offline";
	const touchEnabled = "ontouchstart" in window ? "Yes" : "No";

	return [
		`**Platform:** ${platform}`,
		`**User Agent:** ${ua}`,
		`**Language:** ${language}`,
		`**Screen:** ${screenSize}`,
		`**Viewport:** ${viewportSize}`,
		`**Network:** ${online}`,
		`**Touch:** ${touchEnabled}`,
	].join("\n");
}

/**
 * Build the complete issue body with metadata
 */
export async function buildIssueBody(
	description: string,
	includeMetadata: boolean,
): Promise<string> {
	const parts: string[] = [];

	// User description
	parts.push("## Description");
	parts.push(description || "_No description provided_");
	parts.push("");

	if (includeMetadata) {
		// App info
		parts.push("## Environment");
		parts.push(`**Date:** ${new Date().toISOString()}`);

		// Try to get latest commit
		const commit = await fetchLatestCommit();
		if (commit) {
			parts.push(`**Version:** [${commit.sha}](${commit.url}) - ${commit.message}`);
		}

		parts.push("");
		parts.push("## Device Info");
		parts.push(getDeviceInfo());
	}

	return parts.join("\n");
}

/**
 * Generate the URL for creating a new GitHub issue with pre-filled content
 */
export async function generateIssueUrl(data: BugReportData): Promise<string> {
	const links = getGitHubLinks();
	const body = await buildIssueBody(data.description, data.includeMetadata);

	const params = new URLSearchParams({
		title: data.title || "Bug Report",
		body,
		labels: "bug,from-app",
	});

	return `${links.newIssue}?${params.toString()}`;
}

/**
 * Open the bug report in GitHub
 * Returns the issue body for clipboard backup
 */
export async function openBugReport(data: BugReportData): Promise<string> {
	const body = await buildIssueBody(data.description, data.includeMetadata);

	// Copy to clipboard as backup
	try {
		await navigator.clipboard.writeText(body);
	} catch (error) {
		console.warn("Failed to copy to clipboard:", error);
	}

	// Open GitHub issue page
	const url = await generateIssueUrl(data);
	window.open(url, "_blank", "noopener,noreferrer");

	return body;
}

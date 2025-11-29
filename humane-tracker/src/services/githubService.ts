/**
 * GitHub Integration Service
 * Provides utilities for GitHub repository links and issue creation
 */

// Default repository URL - can be overridden via environment variable
const DEFAULT_REPO_URL = "https://github.com/idvorkin/humane-tracker-1";

// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 5000;

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
	screenshot?: string; // base64 data URL
}

/**
 * Detect if the current platform is macOS
 */
export function isMacPlatform(): boolean {
	return (
		typeof navigator !== "undefined" &&
		navigator.platform.toUpperCase().indexOf("MAC") >= 0
	);
}

/**
 * Get the modifier key name for the current platform
 */
export function getModifierKey(): string {
	return isMacPlatform() ? "Cmd" : "Ctrl";
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

	// Create abort controller for timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=1`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				signal: controller.signal,
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) return null;

		const commits = await response.json();
		if (!commits || commits.length === 0) return null;

		return {
			sha: commits[0].sha.substring(0, 7),
			message: commits[0].commit.message.split("\n")[0],
			url: commits[0].html_url,
		};
	} catch (error) {
		clearTimeout(timeoutId);
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
	hasScreenshot = false,
): Promise<string> {
	const parts: string[] = [];

	// User description
	parts.push("## Description");
	parts.push(description || "_No description provided_");
	parts.push("");

	// Screenshot note
	if (hasScreenshot) {
		parts.push("## Screenshot");
		parts.push(
			"_A screenshot was captured and copied to clipboard. Please paste it below after creating this issue._",
		);
		parts.push("");
	}

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
	const body = await buildIssueBody(
		data.description,
		data.includeMetadata,
		!!data.screenshot,
	);

	const params = new URLSearchParams({
		title: data.title || "Bug Report",
		body,
		labels: "bug,from-app",
	});

	return `${links.newIssue}?${params.toString()}`;
}

/**
 * Convert base64 data URL to Blob for clipboard
 * @throws Error if dataUrl is not a valid data URL format
 */
function dataUrlToBlob(dataUrl: string): Blob {
	// Validate data URL format
	if (!dataUrl || typeof dataUrl !== "string") {
		throw new Error("Invalid data URL: must be a non-empty string");
	}

	const commaIndex = dataUrl.indexOf(",");
	if (commaIndex === -1) {
		throw new Error("Invalid data URL: missing comma separator");
	}

	const header = dataUrl.substring(0, commaIndex);
	const base64Data = dataUrl.substring(commaIndex + 1);

	if (!header.startsWith("data:")) {
		throw new Error("Invalid data URL: must start with 'data:'");
	}

	const mime = header.match(/:(.*?);/)?.[1] || "image/png";
	const bstr = atob(base64Data);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], { type: mime });
}

/**
 * Open the bug report in GitHub
 * Returns the issue body for clipboard backup
 */
export async function openBugReport(data: BugReportData): Promise<string> {
	const body = await buildIssueBody(
		data.description,
		data.includeMetadata,
		!!data.screenshot,
	);

	// Copy screenshot to clipboard if available (so user can paste it)
	// Otherwise copy the text body as backup
	try {
		if (data.screenshot) {
			const blob = dataUrlToBlob(data.screenshot);
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			]);
		} else {
			await navigator.clipboard.writeText(body);
		}
	} catch (error) {
		console.warn("Failed to copy to clipboard:", error);
		// Fallback: try to copy text if image copy failed
		try {
			await navigator.clipboard.writeText(body);
		} catch {
			// Ignore secondary failure
		}
	}

	// Open GitHub issue page
	const url = await generateIssueUrl(data);
	window.open(url, "_blank", "noopener,noreferrer");

	return body;
}

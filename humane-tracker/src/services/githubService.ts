/**
 * GitHub Integration Service
 * Provides utilities for GitHub repository links and issue creation
 */

import {
	BUILD_TIMESTAMP,
	GIT_BRANCH,
	GIT_COMMIT_URL,
	GIT_SHA,
} from "../generated_version";

// Default repository URL - can be overridden via environment variable
const DEFAULT_REPO_URL = "https://github.com/idvorkin/humane-tracker-1";

export interface GitHubLinks {
	repo: string;
	issues: string;
	newIssue: string;
}

export interface BuildInfo {
	sha: string;
	commitUrl: string;
	branch: string;
	timestamp: string;
}

/**
 * Get build-time version info (embedded at build time)
 */
export function getBuildInfo(): BuildInfo {
	return {
		sha: GIT_SHA,
		commitUrl: GIT_COMMIT_URL,
		branch: GIT_BRANCH,
		timestamp: BUILD_TIMESTAMP,
	};
}

export interface BugReportData {
	title: string;
	description: string;
	includeMetadata: boolean;
	screenshot?: string; // base64 data URL
}

/**
 * Get the platform string with fallbacks for deprecated navigator.platform.
 * Uses navigator.userAgentData.platform (modern) with fallback to navigator.platform and userAgent.
 */
function getPlatformString(): string {
	if (typeof navigator === "undefined") return "";

	// Modern API (Chrome 90+, Edge 90+, Opera 76+)
	// @ts-expect-error userAgentData is not yet in all TypeScript lib definitions
	const userAgentData = navigator.userAgentData;
	if (userAgentData?.platform) {
		return userAgentData.platform;
	}

	// Fallback to deprecated navigator.platform
	if (navigator.platform) {
		return navigator.platform;
	}

	// Last resort: extract from userAgent
	return navigator.userAgent || "";
}

/**
 * Detect if the current platform is macOS
 */
export function isMacPlatform(): boolean {
	const platform = getPlatformString().toUpperCase();
	return (
		platform.includes("MAC") ||
		platform.includes("IPHONE") ||
		platform.includes("IPAD")
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
 * Get browser and device information for bug reports
 */
export function getDeviceInfo(): string {
	const ua = navigator.userAgent;
	const platform = getPlatformString() || "Unknown platform";
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
export function buildIssueBody(
	description: string,
	includeMetadata: boolean,
	hasScreenshot = false,
): string {
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

		// Use build-time version info
		const buildInfo = getBuildInfo();
		if (buildInfo.sha && buildInfo.sha !== "development") {
			parts.push(
				`**Version:** [${buildInfo.sha.slice(0, 7)}](${buildInfo.commitUrl}) on ${buildInfo.branch}`,
			);
		} else {
			parts.push("**Version:** development");
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
export function generateIssueUrl(data: BugReportData): string {
	const links = getGitHubLinks();
	const body = buildIssueBody(
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

// Maximum allowed data URL size (10MB) to prevent memory exhaustion
const MAX_DATA_URL_SIZE = 10 * 1024 * 1024;

/**
 * Convert base64 data URL to Blob for clipboard
 * @throws Error if dataUrl is not a valid data URL format or exceeds size limit
 */
function dataUrlToBlob(dataUrl: string): Blob {
	// Validate data URL format
	if (!dataUrl || typeof dataUrl !== "string") {
		throw new Error("Invalid data URL: must be a non-empty string");
	}

	// Size limit check to prevent memory exhaustion
	if (dataUrl.length > MAX_DATA_URL_SIZE) {
		throw new Error(
			`Data URL too large: ${(dataUrl.length / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_DATA_URL_SIZE / 1024 / 1024}MB limit`,
		);
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
 * Build a crash report body for unhandled errors
 */
export function buildCrashReportBody(error: Error): string {
	const buildInfo = getBuildInfo();
	const deviceInfo = getDeviceInfo();

	const parts: string[] = [];

	parts.push("## Error");
	parts.push(`**Message:** ${error.message}`);
	parts.push("");

	parts.push("## Build Info");
	if (buildInfo.sha && buildInfo.sha !== "development") {
		parts.push(
			`**Version:** [${buildInfo.sha.slice(0, 7)}](${buildInfo.commitUrl}) on ${buildInfo.branch}`,
		);
	} else {
		parts.push("**Version:** development");
	}
	parts.push(`**Built:** ${buildInfo.timestamp}`);
	parts.push("");

	parts.push("## Stack Trace");
	parts.push("```");
	parts.push(error.stack || "No stack trace available");
	parts.push("```");
	parts.push("");

	parts.push("## Environment");
	parts.push(deviceInfo);

	return parts.join("\n");
}

/**
 * Generate a GitHub issue URL for a crash report
 */
export function generateCrashReportUrl(error: Error): string {
	const links = getGitHubLinks();
	const body = buildCrashReportBody(error);

	const params = new URLSearchParams({
		title: `Crash: ${error.message.slice(0, 80)}`,
		body,
		labels: "bug,crash,from-app",
	});

	return `${links.newIssue}?${params.toString()}`;
}

/**
 * Open the bug report in GitHub
 * Returns the issue body for clipboard backup
 */
export async function openBugReport(data: BugReportData): Promise<string> {
	const body = buildIssueBody(
		data.description,
		data.includeMetadata,
		!!data.screenshot,
	);

	// Copy screenshot to clipboard if available (so user can paste it)
	// Only touch clipboard when there's a screenshot to paste
	if (data.screenshot) {
		try {
			const blob = dataUrlToBlob(data.screenshot);
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			]);
		} catch (error) {
			console.warn("Failed to copy screenshot to clipboard:", error);
			// Don't fallback to text - user didn't ask for text in clipboard
		}
	}

	// Open GitHub issue page
	const url = generateIssueUrl(data);
	window.open(url, "_blank", "noopener,noreferrer");

	return body;
}

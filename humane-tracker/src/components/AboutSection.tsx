import type { SyncState } from "dexie-cloud-addon";
import { useObservable } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "../config/db";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import { getBuildInfo, getGitHubLinks } from "../services/githubService";
import {
	CloudIcon,
	CopyIcon,
	GitHubIcon,
	InfoIcon,
	RefreshIcon,
	SyncIcon,
} from "./icons/MenuIcons";

type SyncStatePhase =
	| "initial"
	| "not-in-sync"
	| "pushing"
	| "pulling"
	| "in-sync"
	| "error"
	| "offline";

type WebSocketStatus =
	| "not-started"
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

function formatTimestamp(timestamp: string): string {
	if (!timestamp) return "";
	try {
		return new Date(timestamp).toLocaleString();
	} catch {
		return timestamp;
	}
}

function formatTimeAgo(date: Date | null): string {
	if (!date) return "Never";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	if (diffSecs < 10) return "Just now";
	if (diffSecs < 60) return `${diffSecs}s ago`;
	const diffMins = Math.floor(diffSecs / 60);
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	return date.toLocaleDateString();
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getSyncStatusLabel(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	isLocalMode: boolean,
): { label: string; status: "success" | "warning" | "error" | "neutral" } {
	if (isLocalMode) {
		return { label: "Local Only", status: "neutral" };
	}
	if (!syncState) {
		return { label: "Not configured", status: "neutral" };
	}

	const phase = syncState.phase as SyncStatePhase;
	if (phase === "error" || syncState.status === "error") {
		return { label: "Error", status: "error" };
	}
	if (phase === "offline" || syncState.status === "offline") {
		return { label: "Offline", status: "warning" };
	}
	if (syncState.status === "connecting" || phase === "initial") {
		return { label: "Connecting...", status: "warning" };
	}
	if (phase === "pushing") {
		return { label: "Uploading...", status: "warning" };
	}
	if (phase === "pulling") {
		return { label: "Downloading...", status: "warning" };
	}
	if (phase === "in-sync" && wsStatus === "connected") {
		return { label: "Synced", status: "success" };
	}
	if (phase === "in-sync") {
		return { label: "Synced", status: "success" };
	}

	return { label: syncState.phase as string, status: "neutral" };
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

interface AboutSectionProps {
	isLocalMode: boolean;
	userId: string;
}

export function AboutSection({ isLocalMode, userId }: AboutSectionProps) {
	const buildInfo = getBuildInfo();
	const links = getGitHubLinks();
	const { checkForUpdate, isChecking, lastCheckTime } = useVersionCheck();
	const [audioStorageSize, setAudioStorageSize] = useState<number | null>(null);

	// Sync state observables
	const syncStateFromCloud = useObservable(() => db.cloud.syncState, []) as
		| SyncState
		| undefined;
	const wsStatusFromCloud = useObservable(() => db.cloud.webSocketStatus, []) as
		| WebSocketStatus
		| undefined;

	const syncState = isLocalMode ? null : (syncStateFromCloud ?? null);
	const wsStatus = isLocalMode ? null : (wsStatusFromCloud ?? null);
	const syncStatus = getSyncStatusLabel(syncState, wsStatus, isLocalMode);

	useEffect(() => {
		audioRecordingRepository
			.getTotalSizeForUser(userId)
			.then(setAudioStorageSize)
			.catch(() => setAudioStorageSize(null));
	}, [userId]);

	const handleSyncNow = async () => {
		try {
			await db.cloud.sync();
		} catch (err) {
			console.error("Manual sync failed:", err);
			alert(
				`Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	};

	return (
		<div className="settings-section">
			<div className="settings-section-header">
				<div className="settings-section-icon">
					<InfoIcon size={18} />
				</div>
				<span className="settings-section-title">Humane Tracker</span>
			</div>
			<div className="settings-section-content">
				<p className="about-section-tagline">
					Track habits with a humane, local-first approach
				</p>
				<p
					className="about-section-tagline"
					style={{ color: "#ff6b6b", fontWeight: "bold" }}
				>
					TEST: Workflow deploy is working! Delete me after testing.
				</p>

				{/* Build row with GitHub icon */}
				<div className="settings-info-row">
					<span className="settings-info-label">Build</span>
					<span className="settings-info-value">
						<span className="about-build-info">
							{buildInfo.sha.slice(0, 7)} ({buildInfo.branch})
						</span>
					</span>
					<a
						href={buildInfo.commitUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="settings-row-action"
						title="View on GitHub"
					>
						<GitHubIcon size={16} />
					</a>
				</div>

				{/* Built timestamp */}
				{buildInfo.timestamp && (
					<div className="settings-info-row">
						<span className="settings-info-label">Built</span>
						<span className="settings-info-value">
							{formatTimestamp(buildInfo.timestamp)}
						</span>
					</div>
				)}

				{/* URL row with copy icon */}
				<div className="settings-info-row">
					<span className="settings-info-label">URL</span>
					<span className="settings-info-value about-url-value">
						{window.location.origin}
					</span>
					<button
						type="button"
						onClick={shareOrCopyUrl}
						className="settings-row-action"
						title="Copy URL"
					>
						<CopyIcon size={16} />
					</button>
				</div>

				{/* App Version row with refresh icon */}
				<div className="settings-info-row">
					<span className="settings-info-label">App Version</span>
					<span className="settings-info-value">
						{formatTimeAgo(lastCheckTime)}
					</span>
					<button
						type="button"
						onClick={checkForUpdate}
						disabled={isChecking}
						className={`settings-row-action ${isChecking ? "spinning" : ""}`}
						title="Check for update"
					>
						<RefreshIcon size={16} />
					</button>
				</div>

				{/* Cloud Sync row with cloud icon and sync action */}
				<div className="settings-info-row">
					<span className="settings-info-label settings-info-label-with-icon">
						<CloudIcon size={16} />
						Cloud Sync
					</span>
					<span className="settings-info-value">
						<span
							className={`settings-status-badge settings-status-${syncStatus.status}`}
						>
							<span className="settings-status-dot" />
							{syncStatus.label}
						</span>
					</span>
					{!isLocalMode && (
						<button
							type="button"
							onClick={handleSyncNow}
							className="settings-row-action"
							title="Sync now"
						>
							<SyncIcon size={16} />
						</button>
					)}
				</div>

				{/* Storage row */}
				<div className="settings-info-row">
					<span className="settings-info-label">Storage</span>
					<span className="settings-info-value">
						{audioStorageSize !== null ? formatBytes(audioStorageSize) : "—"}
					</span>
				</div>
			</div>
		</div>
	);
}

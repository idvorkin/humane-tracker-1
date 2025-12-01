/**
 * Unified sync status service
 * Single source of truth for sync status computation and labeling
 */

export type SyncStatePhase =
	| "initial"
	| "not-in-sync"
	| "pushing"
	| "pulling"
	| "in-sync"
	| "error"
	| "offline";

export type WebSocketStatus =
	| "not-started"
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

export interface SyncState {
	status: string;
	phase: SyncStatePhase;
	progress?: number;
	error?: Error | { message: string };
	license?: "ok" | "expired" | "deactivated";
}

export interface SyncStatusInfo {
	label: string;
	className: string;
	icon: string;
	badgeStatus: "success" | "warning" | "error" | "neutral";
	hint?: string;
}

export interface DetailedSyncInfo {
	phaseLabel: string;
	connectionLabel: string;
	connectionQuality: "good" | "fair" | "poor" | "none";
	showProgress: boolean;
	showError: boolean;
}

/**
 * Compute sync status for UI display
 * Used by Settings badge, inline details, and any status displays
 */
export function computeSyncStatus(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	isLocalMode: boolean,
	hasSyncedBefore: boolean = false,
): SyncStatusInfo {
	// Local mode - no cloud sync
	if (isLocalMode) {
		return {
			label: "Local Only",
			className: "status-gray",
			icon: "○",
			badgeStatus: "neutral",
		};
	}

	// Not configured
	if (!syncState) {
		return {
			label: "Not configured",
			className: "status-gray",
			icon: "○",
			badgeStatus: "neutral",
		};
	}

	const phase = syncState.phase;

	// Error states
	if (phase === "error" || syncState.status === "error") {
		return {
			label: "Error",
			className: "status-red",
			icon: "●",
			badgeStatus: "error",
		};
	}

	// Offline
	if (phase === "offline" || syncState.status === "offline") {
		return {
			label: "Offline",
			className: "status-gray",
			icon: "○",
			badgeStatus: "warning",
		};
	}

	// Uploading
	if (phase === "pushing") {
		return {
			label: "Uploading...",
			className: "status-blue",
			icon: "↑",
			badgeStatus: "warning",
		};
	}

	// Downloading
	if (phase === "pulling") {
		return {
			label: "Downloading...",
			className: "status-blue",
			icon: "↓",
			badgeStatus: "warning",
		};
	}

	// Synced with live connection
	if (phase === "in-sync" && wsStatus === "connected") {
		return {
			label: "Synced (Live)",
			className: "status-green",
			icon: "●",
			badgeStatus: "success",
		};
	}

	// Synced but no live updates
	if (phase === "in-sync") {
		return {
			label: "Synced",
			className: "status-green",
			icon: "●",
			badgeStatus: "success",
			hint: "Live updates unavailable - connection quality limited",
		};
	}

	// Initial/connecting states
	if (phase === "initial" || syncState.status === "connecting") {
		// Connection issues with live updates
		if (wsStatus === "connecting" && hasSyncedBefore) {
			return {
				label: "Live connection pending...",
				className: "status-yellow",
				icon: "○",
				badgeStatus: "warning",
				hint: "Data synced. Live updates may be blocked by network settings.",
			};
		}

		// Live update connection failed
		if (wsStatus === "error") {
			return {
				label: "Connection limited",
				className: "status-yellow",
				icon: "○",
				badgeStatus: "warning",
				hint: "Live sync unavailable. Check network or contact support.",
			};
		}

		// First time syncing
		if (!hasSyncedBefore) {
			return {
				label: "First sync...",
				className: "status-yellow",
				icon: "○",
				badgeStatus: "warning",
			};
		}

		// Generic connecting
		return {
			label: "Connecting...",
			className: "status-yellow",
			icon: "○",
			badgeStatus: "warning",
		};
	}

	// Disconnected
	if (syncState.status === "disconnected") {
		return {
			label: "Disconnected",
			className: "status-gray",
			icon: "○",
			badgeStatus: "warning",
			hint: wsStatus === "disconnected" ? "Connection lost" : undefined,
		};
	}

	// Fallback
	return {
		label: syncState.status,
		className: "status-gray",
		icon: "○",
		badgeStatus: "neutral",
	};
}

/**
 * Get detailed sync information for expanded Details section
 */
export function getDetailedSyncInfo(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
): DetailedSyncInfo {
	if (!syncState) {
		return {
			phaseLabel: "Not configured",
			connectionLabel: "Not connected",
			connectionQuality: "none",
			showProgress: false,
			showError: false,
		};
	}

	const phase = syncState.phase;

	// Phase labels (user-friendly)
	const phaseLabel = getUserFriendlyPhaseLabel(phase);

	// Connection quality and label
	const { connectionLabel, connectionQuality } =
		getConnectionInfo(wsStatus, phase);

	// Show progress bar?
	const showProgress = phase === "pushing" || phase === "pulling";

	// Show error details?
	const showError = phase === "error" || syncState.status === "error";

	return {
		phaseLabel,
		connectionLabel,
		connectionQuality,
		showProgress,
		showError,
	};
}

/**
 * Get user-friendly phase label (replacing technical jargon)
 */
function getUserFriendlyPhaseLabel(phase: SyncStatePhase): string {
	switch (phase) {
		case "initial":
			return "Initializing";
		case "not-in-sync":
			return "Pending sync";
		case "pushing":
			return "Uploading changes";
		case "pulling":
			return "Downloading changes";
		case "in-sync":
			return "In sync";
		case "error":
			return "Error";
		case "offline":
			return "Offline";
		default:
			return phase;
	}
}

/**
 * Get connection info (replacing WebSocket technical jargon)
 */
function getConnectionInfo(
	wsStatus: WebSocketStatus | null,
	phase: SyncStatePhase,
): { connectionLabel: string; connectionQuality: "good" | "fair" | "poor" | "none" } {
	// No connection at all
	if (!wsStatus || wsStatus === "not-started") {
		return {
			connectionLabel: "Not connected",
			connectionQuality: "none",
		};
	}

	// Connected - live updates working
	if (wsStatus === "connected" && phase === "in-sync") {
		return {
			connectionLabel: "Live updates enabled",
			connectionQuality: "good",
		};
	}

	// Connected but syncing
	if (wsStatus === "connected") {
		return {
			connectionLabel: "Connected",
			connectionQuality: "good",
		};
	}

	// Connecting
	if (wsStatus === "connecting") {
		return {
			connectionLabel: "Establishing connection...",
			connectionQuality: "fair",
		};
	}

	// Disconnected
	if (wsStatus === "disconnected") {
		return {
			connectionLabel: "Connection lost",
			connectionQuality: "poor",
		};
	}

	// Error
	if (wsStatus === "error") {
		return {
			connectionLabel: "Connection failed",
			connectionQuality: "poor",
		};
	}

	return {
		connectionLabel: wsStatus,
		connectionQuality: "fair",
	};
}

/**
 * Format timestamp for relative display (e.g., "2m ago", "Just now")
 */
export function formatTimeAgo(date: Date | null | undefined): string {
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

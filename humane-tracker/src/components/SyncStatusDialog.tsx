import {
	Alert,
	Badge,
	Button,
	Group,
	Modal,
	Progress,
	Stack,
	Text,
} from "@mantine/core";
import type { SyncState } from "dexie-cloud-addon";
import { useObservable } from "dexie-react-hooks";
import type React from "react";
import { db } from "../config/db";

interface SyncStatusDialogProps {
	onClose: () => void;
}

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

interface PersistedSyncState {
	timestamp?: Date;
	serverRevision?: unknown;
	initiallySynced?: boolean;
}

function getStatusDisplay(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	hasSyncedBefore: boolean,
): { label: string; color: string; icon: string; hint?: string } {
	if (!syncState) {
		return { label: "Not configured", color: "gray", icon: "○" };
	}

	const phase = syncState.phase as SyncStatePhase;

	if (phase === "error" || syncState.status === "error") {
		return { label: "Error", color: "red", icon: "●" };
	}
	if (phase === "offline" || syncState.status === "offline") {
		return { label: "Offline", color: "gray", icon: "○" };
	}
	if (phase === "pushing") {
		return { label: "Uploading...", color: "blue", icon: "↑" };
	}
	if (phase === "pulling") {
		return { label: "Downloading...", color: "blue", icon: "↓" };
	}
	if (phase === "in-sync" && wsStatus === "connected") {
		return { label: "Synced (live)", color: "green", icon: "●" };
	}
	if (phase === "in-sync") {
		return {
			label: "Synced",
			color: "green",
			icon: "●",
			hint: "WebSocket not connected - no live updates",
		};
	}

	// Handle "initial" phase with more context
	if (phase === "initial" || syncState.status === "connecting") {
		// WebSocket stuck connecting but we've synced before
		if (wsStatus === "connecting" && hasSyncedBefore) {
			return {
				label: "WebSocket connecting...",
				color: "yellow",
				icon: "○",
				hint: "Data synced via HTTP. WebSocket may be blocked - check domain whitelist.",
			};
		}
		// WebSocket error
		if (wsStatus === "error") {
			return {
				label: "WebSocket failed",
				color: "red",
				icon: "●",
				hint: "Live sync unavailable. Check domain whitelist in Dexie Cloud.",
			};
		}
		// First time connecting
		if (!hasSyncedBefore) {
			return {
				label: "First sync...",
				color: "yellow",
				icon: "○",
			};
		}
		// Generic connecting
		return { label: "Connecting...", color: "yellow", icon: "○" };
	}

	if (syncState.status === "disconnected") {
		return {
			label: "Disconnected",
			color: "gray",
			icon: "○",
			hint: wsStatus === "disconnected" ? "WebSocket disconnected" : undefined,
		};
	}

	return { label: syncState.status, color: "gray", icon: "○" };
}

function formatTimestamp(date: Date | null | undefined): string {
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

function getPhaseLabel(phase: SyncStatePhase): string {
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

function getWsStatusLabel(status: WebSocketStatus | null): string {
	if (!status) return "Not started";
	switch (status) {
		case "not-started":
			return "Not started";
		case "connecting":
			return "Connecting...";
		case "connected":
			return "Connected";
		case "disconnected":
			return "Disconnected";
		case "error":
			return "Error";
		default:
			return status;
	}
}

function getLicenseLabel(
	license: "ok" | "expired" | "deactivated" | undefined,
): string {
	if (!license) return "Unknown";
	switch (license) {
		case "ok":
			return "OK";
		case "expired":
			return "Expired";
		case "deactivated":
			return "Deactivated";
		default:
			return license;
	}
}

export function SyncStatusDialog({ onClose }: SyncStatusDialogProps) {
	const syncState = useObservable(
		() => db.cloud.syncState,
		[],
	) as SyncState | null;
	const wsStatus = useObservable(
		() => db.cloud.webSocketStatus,
		[],
	) as WebSocketStatus | null;
	const persistedState = useObservable(
		() => db.cloud.persistedSyncState,
		[],
	) as PersistedSyncState | null;

	const lastSynced = persistedState?.timestamp
		? new Date(persistedState.timestamp)
		: null;
	const hasSyncedBefore =
		lastSynced !== null || persistedState?.initiallySynced === true;

	const statusDisplay = getStatusDisplay(syncState, wsStatus, hasSyncedBefore);
	const phase = (syncState?.phase ?? "initial") as SyncStatePhase;
	const progress = syncState?.progress;
	const error = syncState?.error;
	const license = syncState?.license;

	const handleSyncNow = async () => {
		try {
			await db.cloud.sync();
		} catch (err) {
			console.error("Manual sync failed:", err);
		}
	};

	const showProgress = phase === "pushing" || phase === "pulling";
	const showError = phase === "error" || syncState?.status === "error";

	return (
		<Modal opened={true} onClose={onClose} title="Sync Status" centered>
			<Stack gap="md">
				<Group justify="center">
					<Badge size="lg" color={statusDisplay.color} variant="light">
						{statusDisplay.icon} {statusDisplay.label}
					</Badge>
				</Group>

				{statusDisplay.hint && (
					<Alert color="blue" variant="light">
						{statusDisplay.hint}
					</Alert>
				)}

				<Stack gap="xs">
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							Phase:
						</Text>
						<Text size="sm">{getPhaseLabel(phase)}</Text>
					</Group>
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							Last synced:
						</Text>
						<Text size="sm">{formatTimestamp(lastSynced)}</Text>
					</Group>
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							WebSocket:
						</Text>
						<Text size="sm">{getWsStatusLabel(wsStatus)}</Text>
					</Group>
					{license && (
						<Group justify="space-between">
							<Text size="sm" c="dimmed">
								License:
							</Text>
							<Text size="sm" c={license !== "ok" ? "yellow" : undefined}>
								{getLicenseLabel(license)}
							</Text>
						</Group>
					)}
				</Stack>

				{showProgress && (
					<div>
						<Progress value={progress ?? 0} size="lg" />
						<Text size="xs" ta="center" mt="xs">
							{progress ?? 0}%
						</Text>
					</div>
				)}

				{showError && error && (
					<Alert color="red" title="Error Details">
						{error.message || String(error)}
					</Alert>
				)}

				<Group justify="flex-end" gap="sm" mt="md">
					<Button variant="default" onClick={onClose}>
						Close
					</Button>
					<Button onClick={handleSyncNow}>Sync Now</Button>
				</Group>
			</Stack>
		</Modal>
	);
}

import {
	Badge,
	Button,
	Divider,
	Group,
	Modal,
	Stack,
	Switch,
	Text,
} from "@mantine/core";
import {
	IconBug,
	IconCloud,
	IconRefresh,
} from "@tabler/icons-react";
import { useObservable } from "dexie-react-hooks";
import type React from "react";
import { db } from "../config/db";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { getModifierKey } from "../services/githubService";

interface SettingsDialogProps {
	isLocalMode: boolean;
	onClose: () => void;
	onOpenSyncStatus: () => void;
	onOpenDebugLogs?: () => void;
	onOpenBugReport?: () => void;
	shakeEnabled?: boolean;
	onShakeEnabledChange?: (enabled: boolean) => void;
	shakeSupported?: boolean;
	shakeHasPermission?: boolean;
	onRequestShakePermission?: () => Promise<boolean>;
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

interface SyncState {
	status: string;
	phase: SyncStatePhase;
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

function getSyncStatusLabel(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	isLocalMode: boolean,
): { label: string; color: string } {
	if (isLocalMode) {
		return { label: "Local Only", color: "gray" };
	}
	if (!syncState) {
		return { label: "Not configured", color: "gray" };
	}

	const phase = syncState.phase;
	if (phase === "error" || syncState.status === "error") {
		return { label: "Error", color: "red" };
	}
	if (phase === "offline" || syncState.status === "offline") {
		return { label: "Offline", color: "yellow" };
	}
	if (syncState.status === "connecting" || phase === "initial") {
		return { label: "Connecting...", color: "yellow" };
	}
	if (phase === "pushing") {
		return { label: "Uploading...", color: "yellow" };
	}
	if (phase === "pulling") {
		return { label: "Downloading...", color: "yellow" };
	}
	if (phase === "in-sync" && wsStatus === "connected") {
		return { label: "Synced (Live)", color: "green" };
	}
	if (phase === "in-sync") {
		return { label: "Synced", color: "green" };
	}

	return { label: syncState.phase, color: "gray" };
}

export function SettingsDialog({
	isLocalMode,
	onClose,
	onOpenSyncStatus,
	onOpenDebugLogs,
	onOpenBugReport,
	shakeEnabled = false,
	onShakeEnabledChange,
	shakeSupported = false,
	shakeHasPermission = false,
	onRequestShakePermission,
}: SettingsDialogProps) {
	const { checkForUpdate, isChecking, lastCheckTime } = useVersionCheck();

	const syncStateFromCloud = useObservable(() => db.cloud.syncState, []) as
		| SyncState
		| undefined;
	const wsStatusFromCloud = useObservable(() => db.cloud.webSocketStatus, []) as
		| WebSocketStatus
		| undefined;

	const syncState = isLocalMode ? null : (syncStateFromCloud ?? null);
	const wsStatus = isLocalMode ? null : (wsStatusFromCloud ?? null);
	const syncStatus = getSyncStatusLabel(syncState, wsStatus, isLocalMode);

	return (
		<Modal
			opened
			onClose={onClose}
			title="Settings"
			size="sm"
			centered
			styles={{
				title: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 },
			}}
		>
			<Stack gap="lg">
				{/* Updates Section */}
				<Stack gap="xs">
					<Group gap="xs">
						<IconRefresh size={18} />
						<Text fw={500}>App Updates</Text>
					</Group>
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							Last checked
						</Text>
						<Text size="sm">{formatTimeAgo(lastCheckTime)}</Text>
					</Group>
					<Button
						variant="light"
						fullWidth
						onClick={checkForUpdate}
						loading={isChecking}
					>
						Check for Update
					</Button>
				</Stack>

				<Divider />

				{/* Sync Section */}
				<Stack gap="xs">
					<Group gap="xs">
						<IconCloud size={18} />
						<Text fw={500}>Cloud Sync</Text>
					</Group>
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							Status
						</Text>
						<Badge color={syncStatus.color} variant="light">
							{syncStatus.label}
						</Badge>
					</Group>
					<Button variant="subtle" fullWidth onClick={() => {
						onClose();
						onOpenSyncStatus();
					}}>
						View Sync Details
					</Button>
					{onOpenDebugLogs && (
						<Button variant="subtle" fullWidth onClick={() => {
							onClose();
							onOpenDebugLogs();
						}}>
							View Debug Logs
						</Button>
					)}
				</Stack>

				<Divider />

				{/* Help & Feedback Section */}
				<Stack gap="xs">
					<Group gap="xs">
						<IconBug size={18} />
						<Text fw={500}>Help & Feedback</Text>
					</Group>
					{onOpenBugReport && (
						<Button
							variant="light"
							fullWidth
							leftSection={<IconBug size={16} />}
							onClick={() => {
								onClose();
								onOpenBugReport();
							}}
						>
							Report a Bug
						</Button>
					)}
					{shakeSupported && onShakeEnabledChange && (
						<Switch
							label="Shake to Report Bug"
							checked={shakeEnabled}
							onChange={async (event) => {
								try {
									const newValue = event.currentTarget.checked;
									if (newValue && !shakeHasPermission) {
										const granted = await onRequestShakePermission?.();
										if (granted) {
											onShakeEnabledChange(true);
										}
									} else {
										onShakeEnabledChange(newValue);
									}
								} catch (err) {
									console.error("Failed to toggle shake setting:", err);
								}
							}}
						/>
					)}
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							Keyboard shortcut
						</Text>
						<Text size="sm">{getModifierKey()}+I</Text>
					</Group>
				</Stack>

				<Divider />

				<Button fullWidth onClick={onClose}>
					Done
				</Button>
			</Stack>
		</Modal>
	);
}

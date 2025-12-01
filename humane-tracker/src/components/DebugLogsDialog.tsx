import {
	ActionIcon,
	Alert,
	Badge,
	Button,
	Code,
	Collapse,
	Group,
	Modal,
	Stack,
	Text,
} from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import type React from "react";
import { useState } from "react";
import { syncLogService } from "../config/db";
import type { SyncLog } from "../types/syncLog";

interface DebugLogsDialogProps {
	onClose: () => void;
}

export function DebugLogsDialog({ onClose }: DebugLogsDialogProps) {
	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [clearError, setClearError] = useState<string | null>(null);
	const [downloadSuccess, setDownloadSuccess] = useState(false);

	// Live query to get logs (automatically updates when logs change)
	const logs = useLiveQuery(() => syncLogService.getLogs(), []) ?? [];

	const handleClearAll = async () => {
		if (confirm("Are you sure you want to clear all debug logs?")) {
			try {
				setClearError(null);
				await syncLogService.clearAll();
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error occurred";
				setClearError(`Failed to clear logs: ${errorMessage}`);
				console.error("Failed to clear logs:", error);
			}
		}
	};

	const handleCopyLogs = async () => {
		try {
			setCopyError(null);
			setCopySuccess(false);
			const logsJson = await syncLogService.exportLogs();
			await navigator.clipboard.writeText(logsJson);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setCopyError(`Failed to copy logs: ${errorMessage}`);
			console.error("Failed to copy logs:", error);
		}
	};

	const handleDownloadLogs = async () => {
		try {
			setCopyError(null);
			setDownloadSuccess(false);
			const logsJson = await syncLogService.exportLogs();
			const blob = new Blob([logsJson], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const filename = `sync-logs-${timestamp}.json`;

			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setDownloadSuccess(true);
			setTimeout(() => setDownloadSuccess(false), 2000);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setCopyError(`Failed to download logs: ${errorMessage}`);
			console.error("Failed to download logs:", error);
		}
	};

	const toggleExpanded = (logId: string) => {
		setExpandedLogId(expandedLogId === logId ? null : logId);
	};

	const formatRelativeTime = (date: Date): string => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSecs = Math.floor(diffMs / 1000);

		if (diffSecs < 10) return "just now";
		if (diffSecs < 60) return `${diffSecs}s ago`;

		const diffMins = Math.floor(diffSecs / 60);
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	};

	const getLevelColor = (level: SyncLog["level"]): string => {
		switch (level) {
			case "success":
				return "green";
			case "error":
				return "red";
			case "warning":
				return "yellow";
			default:
				return "blue";
		}
	};

	const getEventTypeLabel = (eventType: SyncLog["eventType"]): string => {
		switch (eventType) {
			case "syncState":
				return "Sync State";
			case "webSocket":
				return "WebSocket";
			case "persistedState":
				return "Persisted";
			case "syncComplete":
				return "Complete";
			default:
				return eventType;
		}
	};

	return (
		<Modal
			opened={true}
			onClose={onClose}
			title="Debug Logs"
			centered
			size="lg"
			styles={{
				body: { maxHeight: "70vh", overflowY: "auto" },
			}}
		>
			<Stack gap="md">
				<Alert variant="light" color="blue">
					Showing last {logs.length} sync events (max 2000). Logs are stored
					locally and not synced to cloud.
				</Alert>

				<Group gap="xs">
					<Button
						variant="default"
						size="xs"
						onClick={handleDownloadLogs}
						disabled={logs.length === 0}
					>
						{downloadSuccess ? "✓ Downloaded!" : "Download Logs"}
					</Button>
					<Button
						variant="default"
						size="xs"
						onClick={handleCopyLogs}
						disabled={logs.length === 0}
					>
						{copySuccess ? "✓ Copied!" : "Copy All Logs"}
					</Button>
					<Button
						variant="default"
						size="xs"
						onClick={handleClearAll}
						disabled={logs.length === 0}
						color="red"
					>
						Clear All Logs
					</Button>
				</Group>

				{(copyError || clearError) && (
					<Alert color="red" title="Error">
						{copyError && <Text size="sm">{copyError}</Text>}
						{clearError && <Text size="sm">{clearError}</Text>}
					</Alert>
				)}

				{logs.length === 0 ? (
					<Stack gap="sm" align="center" py="xl">
						<Text c="dimmed">No sync events logged yet.</Text>
						<Text size="sm" c="dimmed">
							Sync events will appear here as they occur.
						</Text>
					</Stack>
				) : (
					<Stack gap="xs">
						{logs.map((log) => (
							<div
								key={log.id}
								style={{
									border: "1px solid #e0e0e0",
									borderRadius: "8px",
									padding: "12px",
								}}
							>
								<Group
									justify="space-between"
									style={{ cursor: "pointer" }}
									onClick={() => toggleExpanded(log.id)}
								>
									<Group gap="xs">
										<Badge color={getLevelColor(log.level)} size="sm">
											{log.level}
										</Badge>
										<Text size="sm" fw={500}>
											{getEventTypeLabel(log.eventType)}
										</Text>
									</Group>
									<Group gap="xs">
										<Text size="xs" c="dimmed" title={log.timestamp.toISOString()}>
											{formatRelativeTime(log.timestamp)}
										</Text>
										<ActionIcon size="sm" variant="subtle">
											{expandedLogId === log.id ? (
												<IconChevronDown size={16} />
											) : (
												<IconChevronRight size={16} />
											)}
										</ActionIcon>
									</Group>
								</Group>

								<Text size="sm" mt="xs">
									{log.message}
								</Text>

								<Collapse in={expandedLogId === log.id}>
									{log.data && (
										<div style={{ marginTop: "12px" }}>
											<Text size="sm" fw={500} mb="xs">
												Technical Details:
											</Text>
											<Code block>{JSON.stringify(log.data, null, 2)}</Code>
										</div>
									)}
								</Collapse>
							</div>
						))}
					</Stack>
				)}

				<Button onClick={onClose} fullWidth mt="md">
					Close
				</Button>
			</Stack>
		</Modal>
	);
}

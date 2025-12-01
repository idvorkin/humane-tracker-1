import {
	Alert,
	Badge,
	Box,
	Button,
	Code,
	Collapse,
	Group,
	Modal,
	ScrollArea,
	Stack,
	Text,
	UnstyledButton,
} from "@mantine/core";
import { IconAlertCircle, IconChevronRight, IconDownload, IconCopy, IconTrash } from "@tabler/icons-react";
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
			opened
			onClose={onClose}
			title="Debug Logs"
			size="lg"
			styles={{
				title: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 },
			}}
			centered
		>
			<Stack gap="md">
				<Text size="sm" c="dimmed">
					Showing last {logs.length} sync events (max 2000). Logs are stored
					locally and not synced to cloud.
				</Text>

				<Group>
					<Button
						variant="light"
						size="xs"
						leftSection={<IconDownload size={14} />}
						onClick={handleDownloadLogs}
						disabled={logs.length === 0}
					>
						{downloadSuccess ? "✓ Downloaded!" : "Download"}
					</Button>
					<Button
						variant="light"
						size="xs"
						leftSection={<IconCopy size={14} />}
						onClick={handleCopyLogs}
						disabled={logs.length === 0}
					>
						{copySuccess ? "✓ Copied!" : "Copy All"}
					</Button>
					<Button
						variant="light"
						size="xs"
						color="red"
						leftSection={<IconTrash size={14} />}
						onClick={handleClearAll}
						disabled={logs.length === 0}
					>
						Clear All
					</Button>
				</Group>

				{(copyError || clearError) && (
					<Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
						{copyError || clearError}
					</Alert>
				)}

				{logs.length === 0 ? (
					<Stack align="center" py="xl" gap="xs">
						<Text c="dimmed">No sync events logged yet.</Text>
						<Text size="xs" c="dimmed">
							Sync events will appear here as they occur.
						</Text>
					</Stack>
				) : (
					<ScrollArea h={400}>
						<Stack gap="xs">
							{logs.map((log) => (
								<Box
									key={log.id}
									p="xs"
									style={{
										border: "1px solid var(--mantine-color-dark-4)",
										borderRadius: "var(--mantine-radius-sm)",
									}}
								>
									<UnstyledButton
										onClick={() => toggleExpanded(log.id)}
										w="100%"
									>
										<Group justify="space-between">
											<Group gap="xs">
												<IconChevronRight
													size={14}
													style={{
														transform:
															expandedLogId === log.id
																? "rotate(90deg)"
																: "rotate(0deg)",
														transition: "transform 0.2s",
													}}
												/>
												<Badge size="xs" color={getLevelColor(log.level)}>
													{log.level}
												</Badge>
												<Text size="xs" fw={500}>
													{getEventTypeLabel(log.eventType)}
												</Text>
											</Group>
											<Text
												size="xs"
												c="dimmed"
												title={log.timestamp.toISOString()}
											>
												{formatRelativeTime(log.timestamp)}
											</Text>
										</Group>
									</UnstyledButton>

									<Text size="xs" mt="xs">
										{log.message}
									</Text>

									<Collapse in={expandedLogId === log.id && Boolean(log.data)}>
										<Box mt="xs">
											<Text size="xs" fw={500} mb={4}>
												Technical Details:
											</Text>
											<Code block style={{ fontSize: "11px" }}>
												{JSON.stringify(log.data, null, 2)}
											</Code>
										</Box>
									</Collapse>
								</Box>
							))}
						</Stack>
					</ScrollArea>
				)}

				<Button fullWidth onClick={onClose}>
					Close
				</Button>
			</Stack>
		</Modal>
	);
}

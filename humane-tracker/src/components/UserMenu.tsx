import {
	Avatar,
	Badge,
	Box,
	Divider,
	Menu,
	Text,
	UnstyledButton,
} from "@mantine/core";
import {
	IconBug,
	IconInfoCircle,
	IconLogout,
	IconSettings,
	IconDownload,
} from "@tabler/icons-react";
import React, { useState } from "react";
import { useBugReporter } from "../hooks/useBugReporter";
import { AboutDialog } from "./AboutDialog";
import { BugReportDialog } from "./BugReportDialog";
import { CrashTestButton } from "./CrashTestButton";
import { DebugLogsDialog } from "./DebugLogsDialog";
import { SettingsDialog } from "./SettingsDialog";
import { SyncStatusDialog } from "./SyncStatusDialog";

interface UserMenuProps {
	userName: string;
	avatarLetter: string;
	isLocalMode?: boolean;
	onSignOut: () => void;
	onManageHabits?: () => void;
	onLoadDefaults?: () => void;
	showLoadDefaults?: boolean;
}

export function UserMenu({
	userName,
	avatarLetter,
	isLocalMode = false,
	onSignOut,
	onManageHabits,
	onLoadDefaults,
	showLoadDefaults = false,
}: UserMenuProps) {
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const [showSyncDialog, setShowSyncDialog] = useState(false);
	const [showDebugLogsDialog, setShowDebugLogsDialog] = useState(false);
	const [showAboutDialog, setShowAboutDialog] = useState(false);

	// Bug reporter state
	const bugReporter = useBugReporter();

	return (
		<>
			<Menu shadow="md" width={200} position="bottom-end">
				<Menu.Target>
					<UnstyledButton>
						<Avatar
							size="md"
							radius="xl"
							color="warmAmber"
							variant="filled"
							style={{
								cursor: "pointer",
								transition: "transform 0.15s ease",
							}}
						>
							{avatarLetter}
						</Avatar>
					</UnstyledButton>
				</Menu.Target>

				<Menu.Dropdown>
					<Box px="sm" py="xs">
						<Text size="sm" fw={500}>
							{userName}
						</Text>
						{isLocalMode && (
							<Badge size="xs" color="warmAmber" mt={4}>
								Local Mode
							</Badge>
						)}
					</Box>

					<Divider />

					{onManageHabits && (
						<Menu.Item
							leftSection={<IconSettings size={16} />}
							onClick={onManageHabits}
						>
							Manage Habits
						</Menu.Item>
					)}

					{showLoadDefaults && onLoadDefaults && (
						<Menu.Item
							leftSection={<IconDownload size={16} />}
							onClick={onLoadDefaults}
						>
							Load Default Habits
						</Menu.Item>
					)}

					<Divider />

					<Menu.Item
						leftSection={<IconInfoCircle size={16} />}
						onClick={() => setShowAboutDialog(true)}
					>
						About
					</Menu.Item>

					<Menu.Item
						leftSection={<IconBug size={16} />}
						onClick={() => bugReporter.open()}
					>
						Report Bug
					</Menu.Item>

					<Menu.Item
						leftSection={<IconSettings size={16} />}
						onClick={() => setShowSettingsDialog(true)}
					>
						Settings
					</Menu.Item>

					<CrashTestButton />

					<Divider />

					<Menu.Item
						leftSection={<IconLogout size={16} />}
						color="red"
						onClick={onSignOut}
					>
						{isLocalMode ? "Reset" : "Sign Out"}
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>

			{showSettingsDialog && (
				<SettingsDialog
					isLocalMode={isLocalMode}
					onClose={() => setShowSettingsDialog(false)}
					onOpenSyncStatus={() => setShowSyncDialog(true)}
					onOpenDebugLogs={() => setShowDebugLogsDialog(true)}
					onOpenBugReport={bugReporter.open}
					shakeEnabled={bugReporter.shakeEnabled}
					onShakeEnabledChange={bugReporter.setShakeEnabled}
					shakeSupported={bugReporter.shakeSupported}
					shakeHasPermission={bugReporter.shakeHasPermission}
					onRequestShakePermission={bugReporter.requestShakePermission}
				/>
			)}

			<AboutDialog
				isOpen={showAboutDialog}
				onClose={() => setShowAboutDialog(false)}
			/>

			{showSyncDialog && (
				<SyncStatusDialog onClose={() => setShowSyncDialog(false)} />
			)}

			{showDebugLogsDialog && (
				<DebugLogsDialog onClose={() => setShowDebugLogsDialog(false)} />
			)}

			<BugReportDialog
				isOpen={bugReporter.isOpen}
				onClose={bugReporter.close}
				title={bugReporter.title}
				setTitle={bugReporter.setTitle}
				description={bugReporter.description}
				setDescription={bugReporter.setDescription}
				includeMetadata={bugReporter.includeMetadata}
				setIncludeMetadata={bugReporter.setIncludeMetadata}
				screenshot={bugReporter.screenshot}
				isCapturingScreenshot={bugReporter.isCapturingScreenshot}
				onCaptureScreenshot={bugReporter.captureScreenshot}
				onClearScreenshot={bugReporter.clearScreenshot}
				screenshotSupported={bugReporter.screenshotSupported}
				isMobile={bugReporter.isMobile}
				isSubmitting={bugReporter.isSubmitting}
				onSubmit={bugReporter.submit}
				error={bugReporter.error}
			/>
		</>
	);
}

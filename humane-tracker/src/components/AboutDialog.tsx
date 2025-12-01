import { Anchor, Button, Modal, Stack, Text } from "@mantine/core";
import { IconBrandGithub, IconInfoCircle } from "@tabler/icons-react";
import type React from "react";
import { getBuildInfo, getGitHubLinks } from "../services/githubService";

interface AboutDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
	const buildInfo = getBuildInfo();
	const links = getGitHubLinks();

	const formatTimestamp = (timestamp: string): string => {
		if (!timestamp) return "";
		try {
			return new Date(timestamp).toLocaleString();
		} catch {
			return timestamp;
		}
	};

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title={
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<IconInfoCircle size={22} />
					<span>About</span>
				</div>
			}
			centered
		>
			<Stack gap="lg">
				<div>
					<Text size="lg" fw={600}>
						Humane Tracker
					</Text>
					<Text size="sm" c="dimmed">
						Track habits with a humane, local-first approach
					</Text>
				</div>

				<Stack gap="xs">
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Text size="sm" c="dimmed">
							Build
						</Text>
						<Anchor
							href={buildInfo.commitUrl}
							target="_blank"
							rel="noopener noreferrer"
							size="sm"
						>
							{buildInfo.sha.slice(0, 7)}
						</Anchor>
					</div>

					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Text size="sm" c="dimmed">
							Branch
						</Text>
						<Text size="sm">{buildInfo.branch}</Text>
					</div>

					{buildInfo.timestamp && (
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<Text size="sm" c="dimmed">
								Built
							</Text>
							<Text size="sm">{formatTimestamp(buildInfo.timestamp)}</Text>
						</div>
					)}
				</Stack>

				<Anchor
					href={links.repo}
					target="_blank"
					rel="noopener noreferrer"
					style={{ display: "flex", alignItems: "center", gap: "8px" }}
				>
					<IconBrandGithub size={16} />
					View on GitHub
				</Anchor>

				<Button onClick={onClose} fullWidth>
					Done
				</Button>
			</Stack>
		</Modal>
	);
}

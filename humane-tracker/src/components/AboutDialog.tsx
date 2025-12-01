import {
	Anchor,
	Button,
	Divider,
	Group,
	Modal,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconBrandGithub, IconInfoCircle } from "@tabler/icons-react";
import type React from "react";
import { getBuildInfo, getGitHubLinks } from "../services/githubService";

interface AboutDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
	if (!isOpen) return null;

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
				<Group gap="xs">
					<IconInfoCircle size={22} />
					<Title order={3} style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
						About
					</Title>
				</Group>
			}
			size="sm"
			centered
		>
			<Stack gap="md">
				<Stack gap={4} align="center" py="md">
					<Title
						order={2}
						style={{ fontFamily: "'Fraunces', Georgia, serif" }}
					>
						Humane Tracker
					</Title>
					<Text size="sm" c="dimmed" ta="center">
						Track habits with a humane, local-first approach
					</Text>
				</Stack>

				<Divider />

				<Stack gap="xs">
					<Group justify="space-between">
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
					</Group>

					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							Branch
						</Text>
						<Text size="sm">{buildInfo.branch}</Text>
					</Group>

					{buildInfo.timestamp && (
						<Group justify="space-between">
							<Text size="sm" c="dimmed">
								Built
							</Text>
							<Text size="sm">{formatTimestamp(buildInfo.timestamp)}</Text>
						</Group>
					)}
				</Stack>

				<Divider />

				<Anchor
					href={links.repo}
					target="_blank"
					rel="noopener noreferrer"
					size="sm"
				>
					<Group gap="xs">
						<IconBrandGithub size={16} />
						<Text size="sm">View on GitHub</Text>
					</Group>
				</Anchor>

				<Button fullWidth onClick={onClose} mt="sm">
					Done
				</Button>
			</Stack>
		</Modal>
	);
}

import {
	Alert,
	Box,
	Button,
	Checkbox,
	CloseButton,
	Group,
	Image,
	Kbd,
	Loader,
	Modal,
	Stack,
	Text,
	TextInput,
	Textarea,
} from "@mantine/core";
import {
	IconAlertCircle,
	IconBrandGithub,
	IconCamera,
} from "@tabler/icons-react";
import type React from "react";
import { getModifierKey } from "../services/githubService";

interface BugReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	setTitle: (title: string) => void;
	description: string;
	setDescription: (description: string) => void;
	includeMetadata: boolean;
	setIncludeMetadata: (include: boolean) => void;
	screenshot: string | null;
	isCapturingScreenshot: boolean;
	onCaptureScreenshot: () => void;
	onClearScreenshot: () => void;
	screenshotSupported: boolean;
	isMobile: boolean;
	isSubmitting: boolean;
	onSubmit: () => void;
	error: string | null;
}

export function BugReportDialog({
	isOpen,
	onClose,
	title,
	setTitle,
	description,
	setDescription,
	includeMetadata,
	setIncludeMetadata,
	screenshot,
	isCapturingScreenshot,
	onCaptureScreenshot,
	onClearScreenshot,
	screenshotSupported,
	isMobile,
	isSubmitting,
	onSubmit,
	error,
}: BugReportDialogProps) {
	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	const shortcutKey = getModifierKey();

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Report a Bug"
			size="md"
			centered
			styles={{
				title: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 },
			}}
		>
			<form onSubmit={handleSubmit}>
				<Stack gap="md">
					<TextInput
						label="Title"
						placeholder="Brief summary of the issue"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						autoFocus
					/>

					<Textarea
						label="Description"
						placeholder="What happened? What did you expect to happen?"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={4}
					/>

					{/* Screenshot Section */}
					<Stack gap="xs">
						<Text size="sm" fw={500}>
							Screenshot
						</Text>
						{screenshot ? (
							<Box pos="relative">
								<Image
									src={screenshot}
									alt="Bug report screenshot"
									radius="md"
									style={{ maxHeight: 200 }}
								/>
								<CloseButton
									pos="absolute"
									top={4}
									right={4}
									onClick={onClearScreenshot}
									aria-label="Remove screenshot"
									variant="filled"
									color="dark"
									size="sm"
								/>
							</Box>
						) : screenshotSupported ? (
							<Button
								variant="light"
								leftSection={
									isCapturingScreenshot ? (
										<Loader size={14} />
									) : (
										<IconCamera size={16} />
									)
								}
								onClick={onCaptureScreenshot}
								disabled={isCapturingScreenshot}
							>
								{isCapturingScreenshot ? "Capturing..." : "Capture Screenshot"}
							</Button>
						) : isMobile ? (
							<Text size="xs" c="dimmed">
								Take a screenshot with your device and attach it after creating
								the issue.
							</Text>
						) : null}
					</Stack>

					<Checkbox
						label="Include device info (helps us fix the bug faster)"
						checked={includeMetadata}
						onChange={(e) => setIncludeMetadata(e.target.checked)}
					/>

					{error && (
						<Alert
							icon={<IconAlertCircle size={16} />}
							color="red"
							variant="light"
						>
							{error}
						</Alert>
					)}

					<Group justify="flex-end">
						<Button variant="subtle" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							leftSection={
								isSubmitting ? (
									<Loader size={14} color="white" />
								) : (
									<IconBrandGithub size={16} />
								)
							}
							loading={isSubmitting}
						>
							Open in GitHub
						</Button>
					</Group>

					<Text size="xs" c="dimmed" ta="center">
						Tip: Press <Kbd>{shortcutKey}</Kbd>+<Kbd>I</Kbd> anywhere to report
						a bug
					</Text>
				</Stack>
			</form>
		</Modal>
	);
}

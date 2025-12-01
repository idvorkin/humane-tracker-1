import {
	Alert,
	Button,
	Checkbox,
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
import { IconBrandGithub, IconBug, IconCamera, IconX } from "@tabler/icons-react";
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
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	const shortcutKey = getModifierKey();

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title={
				<Group gap="xs">
					<IconBug size={20} />
					<span>Report a Bug</span>
				</Group>
			}
			centered
			size="lg"
		>
			<form onSubmit={handleSubmit}>
				<Stack gap="md">
					<TextInput
						label="Title"
						placeholder="Brief summary of the issue"
						value={title}
						onChange={(e) => setTitle(e.currentTarget.value)}
						autoFocus
						required
					/>

					<Textarea
						label="Description"
						placeholder="What happened? What did you expect to happen?"
						value={description}
						onChange={(e) => setDescription(e.currentTarget.value)}
						rows={4}
					/>

					{/* Screenshot Section */}
					<div>
						<Text size="sm" fw={500} mb="xs">
							Screenshot
						</Text>
						{screenshot ? (
							<div style={{ position: "relative", display: "inline-block" }}>
								<Image src={screenshot} alt="Bug report screenshot" radius="md" />
								<Button
									size="xs"
									color="red"
									onClick={onClearScreenshot}
									style={{ position: "absolute", top: 8, right: 8 }}
									leftSection={<IconX size={14} />}
								>
									Remove
								</Button>
							</div>
						) : screenshotSupported ? (
							<Button
								variant="default"
								onClick={onCaptureScreenshot}
								disabled={isCapturingScreenshot}
								leftSection={
									isCapturingScreenshot ? (
										<Loader size="xs" />
									) : (
										<IconCamera size={16} />
									)
								}
								fullWidth
							>
								{isCapturingScreenshot ? "Capturing..." : "Capture Screenshot"}
							</Button>
						) : isMobile ? (
							<Text size="sm" c="dimmed">
								Take a screenshot with your device and attach it after creating
								the issue.
							</Text>
						) : null}
					</div>

					<Checkbox
						checked={includeMetadata}
						onChange={(e) => setIncludeMetadata(e.currentTarget.checked)}
						label="Include device info (helps us fix the bug faster)"
					/>

					{error && (
						<Alert color="red" title="Error">
							{error}
						</Alert>
					)}

					<Group justify="space-between" mt="md">
						<Text size="xs" c="dimmed">
							Tip: Press <Kbd>{shortcutKey}</Kbd>+<Kbd>I</Kbd> anywhere to report a bug
						</Text>
					</Group>

					<Group justify="flex-end" gap="sm">
						<Button variant="default" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							leftSection={
								isSubmitting ? (
									<Loader size="xs" />
								) : (
									<IconBrandGithub size={16} />
								)
							}
						>
							{isSubmitting ? "Opening..." : "Open in GitHub"}
						</Button>
					</Group>
				</Stack>
			</form>
		</Modal>
	);
}

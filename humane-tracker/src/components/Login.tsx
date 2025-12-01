import {
	Box,
	Button,
	Card,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconChartBar,
	IconCloud,
	IconDeviceMobile,
	IconLock,
	IconTarget,
} from "@tabler/icons-react";
import type React from "react";
import { db } from "../config/db";

const features = [
	{ icon: IconChartBar, text: "Track 27+ habits across 5 categories" },
	{ icon: IconTarget, text: "Set weekly targets and monitor progress" },
	{ icon: IconCloud, text: "Sync across all your devices" },
	{ icon: IconLock, text: "Your data is private and secure" },
	{ icon: IconDeviceMobile, text: "Works offline with automatic sync" },
];

export const Login: React.FC = () => {
	const handleLogin = async () => {
		try {
			await db.cloud.login();
		} catch (error) {
			console.error("Error signing in:", error);
			alert("Failed to sign in. Please try again.");
		}
	};

	return (
		<Box
			style={{
				minHeight: "100vh",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				padding: "var(--mantine-spacing-lg)",
				background:
					"linear-gradient(180deg, var(--mantine-color-dark-8) 0%, var(--mantine-color-dark-7) 100%)",
			}}
		>
			<Card
				shadow="xl"
				padding="xl"
				radius="lg"
				style={{ width: "100%", maxWidth: 460 }}
			>
				<Stack gap="lg" align="center">
					<Box ta="center">
						<Title
							order={1}
							style={{
								fontFamily: "'Fraunces', Georgia, serif",
								background:
									"linear-gradient(135deg, var(--mantine-color-warmAmber-5) 0%, var(--mantine-color-warmAmber-6) 50%, var(--mantine-color-terracotta-5) 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
							}}
						>
							Humane Tracker
						</Title>
						<Text c="dimmed" size="md" mt="xs">
							Track your wellness habits and build healthy routines
						</Text>
					</Box>

					<Card
						withBorder
						p="md"
						radius="md"
						w="100%"
						style={{ background: "var(--mantine-color-dark-8)" }}
					>
						<Stack gap="xs">
							{features.map((feature, index) => (
								<Group key={index} gap="md" py="xs" wrap="nowrap">
									<feature.icon size={24} style={{ flexShrink: 0 }} />
									<Text size="sm">{feature.text}</Text>
								</Group>
							))}
						</Stack>
					</Card>

					<Button
						fullWidth
						size="md"
						color="gray.0"
						c="dark"
						onClick={handleLogin}
						style={{
							fontWeight: 600,
						}}
					>
						Sign In
					</Button>

					<Text size="xs" c="dimmed" ta="center" px="md">
						We only store your email and name to identify your account. Your
						habit data stays private and syncs across your devices.
					</Text>
				</Stack>
			</Card>
		</Box>
	);
};

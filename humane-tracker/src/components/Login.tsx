import { Button, Container, Paper, Stack, Text, Title } from "@mantine/core";
import {
	IconChartBar,
	IconCloud,
	IconDeviceMobile,
	IconLock,
	IconTarget,
} from "@tabler/icons-react";
import type React from "react";
import { db } from "../config/db";

export const Login: React.FC = () => {
	const handleLogin = async () => {
		try {
			// Dexie Cloud provides a login UI
			await db.cloud.login();
		} catch (error) {
			console.error("Error signing in:", error);
			alert("Failed to sign in. Please try again.");
		}
	};

	return (
		<Container size="xs" style={{ marginTop: "10vh" }}>
			<Paper p="xl" radius="md" withBorder>
				<Stack gap="lg">
					<div>
						<Title order={1} ta="center" mb="xs">
							Humane Tracker
						</Title>
						<Text ta="center" c="dimmed">
							Track your wellness habits and build healthy routines
						</Text>
					</div>

					<Stack gap="md">
						<Stack gap="xs">
							<Text size="sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<IconChartBar size={18} />
								Track 27+ habits across 5 categories
							</Text>
							<Text size="sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<IconTarget size={18} />
								Set weekly targets and monitor progress
							</Text>
							<Text size="sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<IconCloud size={18} />
								Sync across all your devices
							</Text>
							<Text size="sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<IconLock size={18} />
								Your data is private and secure
							</Text>
							<Text size="sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<IconDeviceMobile size={18} />
								Works offline with automatic sync
							</Text>
						</Stack>

						<Button onClick={handleLogin} size="lg" fullWidth>
							Sign In
						</Button>

						<Text size="xs" c="dimmed" ta="center">
							We only store your email and name to identify your account. Your habit
							data stays private and syncs across your devices.
						</Text>
					</Stack>
				</Stack>
			</Paper>
		</Container>
	);
};

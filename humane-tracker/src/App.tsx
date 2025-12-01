import { Box, Center, Loader, Stack, Text } from "@mantine/core";
import { useObservable } from "dexie-react-hooks";
import React, { useEffect, useState } from "react";
import { HabitTracker } from "./components/HabitTracker";
import { Login } from "./components/Login";
import { UserMenu } from "./components/UserMenu";
import { VersionNotification } from "./components/VersionNotification";
import { db } from "./config/db";

const DEXIE_CLOUD_URL = import.meta.env.VITE_DEXIE_CLOUD_URL;
const isCloudConfigured =
	DEXIE_CLOUD_URL && DEXIE_CLOUD_URL !== "https://your-db.dexie.cloud";

function App() {
	const currentUser = useObservable(() => db.cloud.currentUser, [db]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Check if we have a user (including loading state)
		const checkAuth = async () => {
			try {
				// Wait a bit for Dexie Cloud to initialize
				await new Promise((resolve) => setTimeout(resolve, 500));
				setLoading(false);
			} catch (error) {
				console.error("Error checking auth:", error);
				setLoading(false);
			}
		};

		checkAuth();
	}, []);

	const handleSignOut = async () => {
		try {
			if (isCloudConfigured) {
				await db.cloud.logout();
			} else {
				// In local mode, just clear data and reload
				localStorage.removeItem("localUserId");
				window.location.reload();
			}
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};

	if (loading) {
		return (
			<Center mih="100vh">
				<Stack align="center" gap="lg">
					<Loader color="warmAmber" size="lg" />
					<Text c="dimmed">Loading...</Text>
				</Stack>
			</Center>
		);
	}

	// Local mode - use a fixed user ID or create one
	if (!isCloudConfigured) {
		let localUserId = localStorage.getItem("localUserId");
		if (!localUserId) {
			localUserId = "local-user-" + Date.now();
			localStorage.setItem("localUserId", localUserId);
		}

		return (
			<Box mih="100vh" p="md">
				<HabitTracker
					userId={localUserId}
					userMenu={(menuProps) => (
						<UserMenu
							userName="Local User"
							avatarLetter="L"
							isLocalMode={true}
							onSignOut={handleSignOut}
							onManageHabits={menuProps.onManageHabits}
							onLoadDefaults={menuProps.onLoadDefaults}
							showLoadDefaults={menuProps.showLoadDefaults}
						/>
					)}
				/>
				<VersionNotification />
			</Box>
		);
	}

	// Cloud mode - require authentication
	if (!currentUser || !currentUser.userId) {
		return <Login />;
	}

	const displayName = currentUser.name || currentUser.email || "User";
	const avatarLetter = currentUser.name
		? currentUser.name[0].toUpperCase()
		: "?";

	return (
		<Box mih="100vh" p="md">
			<HabitTracker
				userId={currentUser.userId}
				userMenu={(menuProps) => (
					<UserMenu
						userName={displayName}
						avatarLetter={avatarLetter}
						isLocalMode={false}
						onSignOut={handleSignOut}
						onManageHabits={menuProps.onManageHabits}
						onLoadDefaults={menuProps.onLoadDefaults}
						showLoadDefaults={menuProps.showLoadDefaults}
					/>
				)}
			/>
			<VersionNotification />
		</Box>
	);
}

export default App;

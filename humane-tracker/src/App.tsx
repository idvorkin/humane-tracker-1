import { useObservable } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { AnonymousWarning } from "./components/AnonymousWarning";
import { HabitTracker } from "./components/HabitTracker";
import { LoginButton } from "./components/LoginButton";
import { UserMenu } from "./components/UserMenu";
import { VersionNotification } from "./components/VersionNotification";
import { db } from "./config/db";
import { handleSignIn } from "./utils/authUtils";
import "./App.css";

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
			<div className="loading-container">
				<div className="loading-spinner">Loading...</div>
			</div>
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
			<div className="App">
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
			</div>
		);
	}

	// Cloud mode - check if logged out
	// Dexie Cloud sets userId to "unauthorized" when user cancels login
	const isLoggedOut =
		!currentUser?.userId || currentUser.userId === "unauthorized";

	if (isLoggedOut) {
		return (
			<div className="App">
				<AnonymousWarning onSignIn={handleSignIn} />
				<HabitTracker
					userId="anonymous"
					userMenu={() => <LoginButton />}
				/>
				<VersionNotification />
			</div>
		);
	}

	// At this point we know currentUser.userId exists and isn't "unauthorized"
	// (TypeScript can't infer this from the early return above)
	const userId = currentUser.userId as string;
	const displayName = currentUser.name || currentUser.email || "User";
	const avatarLetter =
		(currentUser.name || currentUser.email || "?")[0]?.toUpperCase() ?? "?";

	return (
		<div className="App">
			<HabitTracker
				userId={userId}
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
		</div>
	);
}

export default App;

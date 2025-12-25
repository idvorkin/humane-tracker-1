import { useObservable } from "dexie-react-hooks";
import { useCallback, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { AffirmationBanner } from "./components/AffirmationBanner";
import { AnonymousWarning } from "./components/AnonymousWarning";
import { HabitTracker } from "./components/HabitTracker";
import { LoginButton } from "./components/LoginButton";
import { SignInDialog } from "./components/SignInDialog";
import { StaleAuthNotification } from "./components/StaleAuthNotification";
import { UserMenu } from "./components/UserMenu";
import { VersionNotification } from "./components/VersionNotification";
import { db } from "./config/db";
import { RecordingsPage } from "./pages/RecordingsPage";
import {
	handleSignIn,
	type LocalDataSummary,
	type SignInChoice,
} from "./utils/authUtils";
import "./App.css";

const DEXIE_CLOUD_URL = import.meta.env.VITE_DEXIE_CLOUD_URL;
const isCloudConfigured =
	DEXIE_CLOUD_URL && DEXIE_CLOUD_URL !== "https://your-db.dexie.cloud";

function App() {
	const currentUser = useObservable(() => db.cloud.currentUser, [db]);
	const [loading, setLoading] = useState(true);
	const [signOutError, setSignOutError] = useState<string | null>(null);

	// Sign-in dialog state
	const [signInDialogData, setSignInDialogData] = useState<{
		summary: LocalDataSummary;
		resolve: (choice: SignInChoice) => void;
	} | null>(null);

	// Callback to show sign-in dialog and wait for user choice
	const promptForSignInChoice = useCallback(
		(summary: LocalDataSummary): Promise<SignInChoice> => {
			return new Promise((resolve) => {
				setSignInDialogData({ summary, resolve });
			});
		},
		[],
	);

	// Handle sign-in with prompt for local data
	const handleSignInWithPrompt = useCallback(() => {
		handleSignIn(promptForSignInChoice).catch((error) => {
			console.error("Sign-in failed:", error);
		});
	}, [promptForSignInChoice]);

	// Handle user's choice in sign-in dialog
	const handleSignInChoice = useCallback(
		(choice: SignInChoice) => {
			if (signInDialogData) {
				signInDialogData.resolve(choice);
				setSignInDialogData(null);
			}
		},
		[signInDialogData],
	);

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
		setSignOutError(null);
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
			const message =
				error instanceof Error ? error.message : "Unknown error occurred";
			setSignOutError(`Sign-out failed: ${message}. Please try again.`);
		}
	};

	if (loading) {
		return (
			<div className="loading-container">
				<AffirmationBanner />
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
			<Routes>
				<Route
					path="/recordings"
					element={<RecordingsPage userId={localUserId} />}
				/>
				<Route
					path="*"
					element={
						<div className="App">
							{signOutError && (
								<div className="error-banner" role="alert">
									{signOutError}
									<button
										type="button"
										onClick={() => setSignOutError(null)}
										aria-label="Dismiss error"
									>
										×
									</button>
								</div>
							)}
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
					}
				/>
			</Routes>
		);
	}

	// Cloud mode - check if logged out
	// Dexie Cloud sets userId to "unauthorized" when user cancels login
	const isLoggedOut =
		!currentUser?.userId || currentUser.userId === "unauthorized";

	if (isLoggedOut) {
		return (
			<Routes>
				<Route
					path="/recordings"
					element={<RecordingsPage userId="anonymous" />}
				/>
				<Route
					path="*"
					element={
						<div className="App">
							<AnonymousWarning onSignIn={handleSignInWithPrompt} />
							<HabitTracker
								userId="anonymous"
								userMenu={(menuProps) => (
									<UserMenu
										userName="Guest"
										avatarLetter="G"
										onSignIn={handleSignInWithPrompt}
										onManageHabits={menuProps.onManageHabits}
										onLoadDefaults={menuProps.onLoadDefaults}
										showLoadDefaults={menuProps.showLoadDefaults}
									/>
								)}
							/>
							<VersionNotification />
							{signInDialogData && (
								<SignInDialog
									summary={signInDialogData.summary}
									onChoice={handleSignInChoice}
								/>
							)}
						</div>
					}
				/>
			</Routes>
		);
	}

	// At this point we know currentUser.userId exists and isn't "unauthorized"
	// (TypeScript can't infer this from the early return above)
	const userId = currentUser.userId as string;
	const displayName = currentUser.name || currentUser.email || "User";
	const avatarLetter =
		(currentUser.name || currentUser.email || "?")[0]?.toUpperCase() ?? "?";

	return (
		<Routes>
			<Route path="/recordings" element={<RecordingsPage userId={userId} />} />
			<Route
				path="*"
				element={
					<div className="App">
						{signOutError && (
							<div className="error-banner" role="alert">
								{signOutError}
								<button
									type="button"
									onClick={() => setSignOutError(null)}
									aria-label="Dismiss error"
								>
									×
								</button>
							</div>
						)}
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
						<StaleAuthNotification />
					</div>
				}
			/>
		</Routes>
	);
}

export default App;

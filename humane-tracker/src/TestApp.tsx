import React from "react";
import { HabitTracker } from "./components/HabitTracker";
import { UserMenu } from "./components/UserMenu";
import "./App.css";

function TestApp() {
	// Mock repositories are initialized in index.tsx before React renders
	// Use mock mode - no authentication required
	return (
		<div className="App">
			<div className="app-header">
				<div className="user-info">
					<span className="user-name">Test Mode (No Auth Required)</span>
				</div>
			</div>
			<HabitTracker
				userId="mock-user"
				userMenu={(menuProps) => (
					<UserMenu
						userName="Test User"
						avatarLetter="T"
						isLocalMode={true}
						onSignOut={() => {
							localStorage.clear();
							window.location.reload();
						}}
						onManageHabits={menuProps.onManageHabits}
						onLoadDefaults={menuProps.onLoadDefaults}
						showLoadDefaults={menuProps.showLoadDefaults}
					/>
				)}
			/>
		</div>
	);
}

export default TestApp;

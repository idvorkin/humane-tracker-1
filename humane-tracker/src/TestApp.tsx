import React from "react";
import { HabitTracker } from "./components/HabitTracker";
import { UserMenu } from "./components/UserMenu";
import "./App.css";

function TestApp() {
	// E2E mode - bypasses authentication but uses real IndexedDB
	// Used for both ?test=true and ?e2e=true modes
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

import { HabitTracker } from "./components/HabitTracker";
import { LoginButton } from "./components/LoginButton";
import "./App.css";

/**
 * E2E test app for testing the logged-out state with login button.
 * Used when ?e2e-login=true is in the URL.
 */
function TestLoginApp() {
	return (
		<div className="App">
			<HabitTracker userId="anonymous" userMenu={() => <LoginButton />} />
		</div>
	);
}

export default TestLoginApp;

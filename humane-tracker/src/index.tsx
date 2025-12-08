import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import "./index.css";
import App from "./App";
import { CrashFallback } from "./components/CrashFallback";
import TestApp from "./TestApp";
import TestLoginApp from "./TestLoginApp";

// Check if in test/E2E mode
const isTestMode = window.location.search.includes("test=true");
const isE2EMode = window.location.search.includes("e2e=true");
const isE2ELoginMode = window.location.search.includes("e2e-login=true");

if (isTestMode || isE2EMode) {
	console.log(
		"[index.tsx] Running in E2E mode - using real IndexedDB without auth",
	);
}
if (isE2ELoginMode) {
	console.log("[index.tsx] Running in E2E login mode - testing login UI");
}

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

// Use TestLoginApp for ?e2e-login=true, TestApp for ?test=true or ?e2e=true, otherwise regular App
const AppComponent = isE2ELoginMode
	? TestLoginApp
	: isTestMode || isE2EMode
		? TestApp
		: App;

root.render(
	<ErrorBoundary FallbackComponent={CrashFallback}>
		<React.StrictMode>
			<AppComponent />
		</React.StrictMode>
	</ErrorBoundary>,
);

import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import "./index.css";
import App from "./App";
import { CrashFallback } from "./components/CrashFallback";
import TestApp from "./TestApp";

// Check if in test/E2E mode
const isTestMode = window.location.search.includes("test=true");
const isE2EMode = window.location.search.includes("e2e=true");

if (isTestMode || isE2EMode) {
	console.log(
		"[index.tsx] Running in E2E mode - using real IndexedDB without auth",
	);
}

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

// Use TestApp if ?test=true or ?e2e=true is in URL, otherwise use regular App
const AppComponent = isTestMode || isE2EMode ? TestApp : App;

root.render(
	<ErrorBoundary FallbackComponent={CrashFallback}>
		<React.StrictMode>
			<AppComponent />
		</React.StrictMode>
	</ErrorBoundary>,
);

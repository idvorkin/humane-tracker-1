import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { CrashFallback } from "./components/CrashFallback";
import TestLoginApp from "./TestLoginApp";

// Check if in E2E login mode (for testing login UI specifically)
const isE2ELoginMode = window.location.search.includes("e2e-login=true");

if (isE2ELoginMode) {
	console.log("[index.tsx] Running in E2E login mode - testing login UI");
}

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

// Use TestLoginApp for ?e2e-login=true (tests login button), otherwise regular App
const AppComponent = isE2ELoginMode ? TestLoginApp : App;

root.render(
	<ErrorBoundary FallbackComponent={CrashFallback}>
		<React.StrictMode>
			<BrowserRouter>
				<AppComponent />
			</BrowserRouter>
		</React.StrictMode>
	</ErrorBoundary>,
);

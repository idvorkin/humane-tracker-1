import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import "./index.css";
import App from "./App";
import { CrashFallback } from "./components/CrashFallback";
import TestApp from "./TestApp";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

// Use TestApp if ?test=true is in URL, otherwise use regular App
const isTestMode = window.location.search.includes("test=true");
const AppComponent = isTestMode ? TestApp : App;

root.render(
	<ErrorBoundary FallbackComponent={CrashFallback}>
		<React.StrictMode>
			<MantineProvider>
				<AppComponent />
			</MantineProvider>
		</React.StrictMode>
	</ErrorBoundary>,
);

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import App from "./App";
import { CrashFallback } from "./components/CrashFallback";
import { mantineTheme } from "./config/theme";
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
			<MantineProvider theme={mantineTheme} defaultColorScheme="dark">
				<ModalsProvider>
					<Notifications position="top-right" />
					<AppComponent />
				</ModalsProvider>
			</MantineProvider>
		</React.StrictMode>
	</ErrorBoundary>,
);

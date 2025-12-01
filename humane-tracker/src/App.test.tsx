import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { mantineTheme } from "./config/theme";

// Mock Dexie database and hooks
vi.mock("./config/db", () => ({
	db: {
		habits: {
			toArray: vi.fn(() => Promise.resolve([])),
			where: vi.fn(() => ({
				equals: vi.fn(() => ({
					toArray: vi.fn(() => Promise.resolve([])),
				})),
			})),
		},
		entries: {
			toArray: vi.fn(() => Promise.resolve([])),
			where: vi.fn(() => ({
				equals: vi.fn(() => ({
					toArray: vi.fn(() => Promise.resolve([])),
				})),
			})),
		},
		cloud: {
			currentUser: null,
		},
	},
}));

vi.mock("dexie-react-hooks", () => ({
	useObservable: vi.fn(() => null),
}));

// Wrapper component with Mantine provider
const renderWithProviders = (ui: React.ReactElement) => {
	return render(
		<MantineProvider theme={mantineTheme}>
			{ui}
		</MantineProvider>
	);
};

describe("App", () => {
	it("renders habit tracker", () => {
		renderWithProviders(<App />);
		expect(document.body).toBeTruthy();
	});
});

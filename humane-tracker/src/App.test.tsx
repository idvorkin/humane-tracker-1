import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

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

describe("App", () => {
	it("renders habit tracker", () => {
		render(<App />);
		expect(document.body).toBeTruthy();
	});
});

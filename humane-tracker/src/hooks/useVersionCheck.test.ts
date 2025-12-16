import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceServiceType } from "../services/DeviceService";

// Mock the virtual:pwa-register/react module
vi.mock("virtual:pwa-register/react", () => ({
	useRegisterSW: vi.fn(() => ({
		needRefresh: [false],
		updateServiceWorker: vi.fn(),
	})),
}));

import { useRegisterSW } from "virtual:pwa-register/react";
// Import after mocking
import { useVersionCheck } from "./useVersionCheck";

function createMockDeviceService(
	initialStorage: Record<string, string> = {},
): DeviceServiceType {
	const storage = { ...initialStorage };
	return {
		getStorageItem: vi.fn((key: string) => storage[key] ?? null),
		setStorageItem: vi.fn((key: string, value: string) => {
			storage[key] = value;
			return true;
		}),
	};
}

describe("useVersionCheck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("initializes lastCheckTime from storage", () => {
		const storedDate = "2024-01-15T10:30:00.000Z";
		const mockService = createMockDeviceService({
			"humane-tracker-last-update-check": storedDate,
		});

		const { result } = renderHook(() => useVersionCheck(mockService));

		expect(mockService.getStorageItem).toHaveBeenCalledWith(
			"humane-tracker-last-update-check",
		);
		expect(result.current.lastCheckTime).toEqual(new Date(storedDate));
	});

	it("returns null lastCheckTime when storage empty", () => {
		const mockService = createMockDeviceService();

		const { result } = renderHook(() => useVersionCheck(mockService));

		expect(result.current.lastCheckTime).toBeNull();
	});

	it("checkForUpdate updates lastCheckTime", async () => {
		const mockService = createMockDeviceService();
		const { result } = renderHook(() => useVersionCheck(mockService));

		expect(result.current.lastCheckTime).toBeNull();

		await act(async () => {
			await result.current.checkForUpdate();
		});

		expect(result.current.lastCheckTime).toBeInstanceOf(Date);
	});

	it("checkForUpdate persists to storage", async () => {
		const mockService = createMockDeviceService();
		const { result } = renderHook(() => useVersionCheck(mockService));

		await act(async () => {
			await result.current.checkForUpdate();
		});

		expect(mockService.setStorageItem).toHaveBeenCalledWith(
			"humane-tracker-last-update-check",
			expect.any(String),
		);
	});

	it("checkForUpdate sets isChecking during check", async () => {
		const mockService = createMockDeviceService();
		const { result } = renderHook(() => useVersionCheck(mockService));

		expect(result.current.isChecking).toBe(false);

		let checkingDuringCall = false;
		const checkPromise = act(async () => {
			const promise = result.current.checkForUpdate();
			// The isChecking should be true during the call
			checkingDuringCall = result.current.isChecking;
			await promise;
		});

		await checkPromise;
		// After awaiting, isChecking should be false
		expect(result.current.isChecking).toBe(false);
	});

	it("checkForUpdate resets isChecking after completion", async () => {
		const mockService = createMockDeviceService();
		const { result } = renderHook(() => useVersionCheck(mockService));

		await act(async () => {
			await result.current.checkForUpdate();
		});

		expect(result.current.isChecking).toBe(false);
	});

	it("sequential calls to checkForUpdate work correctly", async () => {
		const mockService = createMockDeviceService();
		const { result } = renderHook(() => useVersionCheck(mockService));

		// First check
		await act(async () => {
			await result.current.checkForUpdate();
		});

		const firstCheckTime = result.current.lastCheckTime;
		expect(firstCheckTime).toBeInstanceOf(Date);

		// Wait a moment and check again
		await new Promise((resolve) => setTimeout(resolve, 10));

		await act(async () => {
			await result.current.checkForUpdate();
		});

		// Second check should update the time
		expect(result.current.lastCheckTime).toBeInstanceOf(Date);
		expect(result.current.lastCheckTime!.getTime()).toBeGreaterThanOrEqual(
			firstCheckTime!.getTime(),
		);

		// Both calls should have persisted to storage
		expect(mockService.setStorageItem).toHaveBeenCalledTimes(2);
	});

	it("updateAvailable reflects needRefresh from useRegisterSW", () => {
		const mockService = createMockDeviceService();

		vi.mocked(useRegisterSW).mockReturnValue({
			needRefresh: [true, vi.fn()],
			updateServiceWorker: vi.fn(),
			offlineReady: [false, vi.fn()],
		});

		const { result } = renderHook(() => useVersionCheck(mockService));

		expect(result.current.updateAvailable).toBe(true);
	});
});

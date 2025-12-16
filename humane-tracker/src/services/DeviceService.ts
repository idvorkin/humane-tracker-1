/**
 * Humble Object for browser API access.
 * Isolates localStorage and window calls for testability.
 */
export const DeviceService = {
	getStorageItem(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},

	setStorageItem(key: string, value: string): boolean {
		try {
			localStorage.setItem(key, value);
			return true;
		} catch {
			// localStorage unavailable (private browsing, quota)
			console.warn(
				`[DeviceService] Failed to save to localStorage (key: ${key}). Storage may be unavailable.`,
			);
			return false;
		}
	},
};

export type DeviceServiceType = typeof DeviceService;

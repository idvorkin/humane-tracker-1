/**
 * Device Information Service
 * Uses Humble Object pattern for browser API access (testability)
 *
 * This service collects device/environment details for bug reports.
 * Browser APIs are abstracted via BrowserAPIs interface for easy mocking in tests.
 */

/**
 * Browser API abstraction for testability (Humble Object pattern)
 */
export interface BrowserAPIs {
	// Navigator APIs
	userAgent: string;
	platform: string;
	language: string;
	onLine: boolean;
	deviceMemory?: number; // Chrome/Edge only
	hardwareConcurrency?: number;
	maxTouchPoints?: number;

	// Connection API (Chrome/Edge only)
	connectionEffectiveType?: string;

	// Window APIs
	innerWidth: number;
	innerHeight: number;
	devicePixelRatio: number;
	screenWidth: number;
	screenHeight: number;

	// Feature detection
	hasTouchStart: boolean;

	// Display mode (PWA detection)
	isStandalone: boolean;
}

/**
 * Get current browser APIs (production implementation)
 */
export function getBrowserAPIs(): BrowserAPIs {
	// Type assertion for connection API (not in standard TypeScript types)
	const nav = navigator as Navigator & {
		connection?: {
			effectiveType?: string;
		};
	};

	// Safely check display mode (PWA detection)
	let isStandalone = false;
	try {
		if (typeof window !== "undefined" && window.matchMedia) {
			isStandalone = window.matchMedia("(display-mode: standalone)").matches;
		}
	} catch {
		// matchMedia not available or failed - default to false
		isStandalone = false;
	}

	return {
		// Navigator APIs
		userAgent: navigator.userAgent,
		platform: navigator.platform || "Unknown",
		language: navigator.language || "Unknown",
		onLine: navigator.onLine,
		deviceMemory: (navigator as Navigator & { deviceMemory?: number })
			.deviceMemory,
		hardwareConcurrency: navigator.hardwareConcurrency,
		maxTouchPoints: navigator.maxTouchPoints,

		// Connection API
		connectionEffectiveType: nav.connection?.effectiveType,

		// Window APIs
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
		devicePixelRatio: window.devicePixelRatio,
		screenWidth: window.screen.width,
		screenHeight: window.screen.height,

		// Feature detection
		hasTouchStart: "ontouchstart" in window,

		// Display mode (PWA detection)
		isStandalone,
	};
}

/**
 * Check if device is mobile based on user agent
 */
export function isMobileDevice(userAgent: string): boolean {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		userAgent,
	);
}

/**
 * Format device info as markdown for bug reports
 */
export function formatDeviceInfo(apis: BrowserAPIs): string {
	// Screen dimensions with pixel ratio
	const pixelRatio =
		apis.devicePixelRatio !== 1 ? ` @${apis.devicePixelRatio}x` : "";
	const screen = `${apis.innerWidth}x${apis.innerHeight}${pixelRatio}`;

	// Device memory (GB or "Unknown")
	const deviceMemory = apis.deviceMemory
		? `${apis.deviceMemory} GB`
		: "Unknown";

	// CPU cores
	const cpuCores = apis.hardwareConcurrency?.toString() || "Unknown";

	// Connection type (Chrome/Edge only)
	const connectionType = apis.connectionEffectiveType || "Unknown";

	// Display mode (PWA vs browser)
	const displayMode = apis.isStandalone ? "standalone" : "browser";

	// Touch capability
	const touchDevice =
		apis.hasTouchStart || (apis.maxTouchPoints && apis.maxTouchPoints > 0)
			? "Yes"
			: "No";

	// Mobile detection
	const mobile = isMobileDevice(apis.userAgent) ? "Yes" : "No";

	// Online status
	const online = apis.onLine ? "Online" : "Offline";

	return [
		`**Screen:** ${screen}`,
		`**Device Memory:** ${deviceMemory}`,
		`**CPU Cores:** ${cpuCores}`,
		`**Online Status:** ${online}`,
		`**Connection Type:** ${connectionType}`,
		`**Display Mode:** ${displayMode}`,
		`**Touch Device:** ${touchDevice}`,
		`**Mobile:** ${mobile}`,
		`**Platform:** ${apis.platform}`,
		`**User Agent:** ${apis.userAgent}`,
		`**Language:** ${apis.language}`,
	].join("\n");
}

/**
 * Get formatted device info for bug reports (uses real browser APIs)
 */
export function getDeviceInfo(): string {
	const apis = getBrowserAPIs();
	return formatDeviceInfo(apis);
}

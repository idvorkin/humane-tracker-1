import { describe, expect, it } from "vitest";
import type { BrowserAPIs } from "./deviceInfoService";
import {
	formatDeviceInfo,
	getBrowserAPIs,
	getDeviceInfo,
	isMobileDevice,
} from "./deviceInfoService";

describe("deviceInfoService", () => {
	describe("isMobileDevice", () => {
		it("detects iPhone", () => {
			const ua =
				"Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15";
			expect(isMobileDevice(ua)).toBe(true);
		});

		it("detects Android", () => {
			const ua =
				"Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36";
			expect(isMobileDevice(ua)).toBe(true);
		});

		it("detects iPad", () => {
			const ua =
				"Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15";
			expect(isMobileDevice(ua)).toBe(true);
		});

		it("does not detect desktop Chrome as mobile", () => {
			const ua =
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
			expect(isMobileDevice(ua)).toBe(false);
		});

		it("does not detect desktop Safari as mobile", () => {
			const ua =
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15";
			expect(isMobileDevice(ua)).toBe(false);
		});
	});

	describe("formatDeviceInfo", () => {
		it("formats all device info fields", () => {
			const apis: BrowserAPIs = {
				userAgent: "Mozilla/5.0 Test Browser",
				platform: "MacIntel",
				language: "en-US",
				onLine: true,
				deviceMemory: 8,
				hardwareConcurrency: 8,
				maxTouchPoints: 0,
				connectionEffectiveType: "4g",
				innerWidth: 1920,
				innerHeight: 1080,
				devicePixelRatio: 2,
				screenWidth: 3840,
				screenHeight: 2160,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);

			// Check that all required fields are present
			expect(info).toContain("**Screen:** 1920x1080 @2x");
			expect(info).toContain("**Device Memory:** 8 GB");
			expect(info).toContain("**CPU Cores:** 8");
			expect(info).toContain("**Online Status:** Online");
			expect(info).toContain("**Connection Type:** 4g");
			expect(info).toContain("**Display Mode:** browser");
			expect(info).toContain("**Touch Device:** No");
			expect(info).toContain("**Mobile:** No");
			expect(info).toContain("**Platform:** MacIntel");
			expect(info).toContain("**User Agent:** Mozilla/5.0 Test Browser");
			expect(info).toContain("**Language:** en-US");
		});

		it("handles missing device memory gracefully", () => {
			const apis: BrowserAPIs = {
				userAgent: "Firefox",
				platform: "Win32",
				language: "en-US",
				onLine: true,
				deviceMemory: undefined,
				hardwareConcurrency: 4,
				maxTouchPoints: 0,
				connectionEffectiveType: undefined,
				innerWidth: 1920,
				innerHeight: 1080,
				devicePixelRatio: 1,
				screenWidth: 1920,
				screenHeight: 1080,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Device Memory:** Unknown");
		});

		it("handles missing connection type gracefully", () => {
			const apis: BrowserAPIs = {
				userAgent: "Safari",
				platform: "MacIntel",
				language: "en-US",
				onLine: true,
				deviceMemory: undefined,
				hardwareConcurrency: 8,
				maxTouchPoints: 0,
				connectionEffectiveType: undefined,
				innerWidth: 1440,
				innerHeight: 900,
				devicePixelRatio: 2,
				screenWidth: 2880,
				screenHeight: 1800,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Connection Type:** Unknown");
		});

		it("handles missing hardware concurrency gracefully", () => {
			const apis: BrowserAPIs = {
				userAgent: "Old Browser",
				platform: "Win32",
				language: "en-US",
				onLine: true,
				deviceMemory: undefined,
				hardwareConcurrency: undefined,
				maxTouchPoints: 0,
				connectionEffectiveType: undefined,
				innerWidth: 800,
				innerHeight: 600,
				devicePixelRatio: 1,
				screenWidth: 800,
				screenHeight: 600,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**CPU Cores:** Unknown");
		});

		it("detects touch device via ontouchstart", () => {
			const apis: BrowserAPIs = {
				userAgent: "Mobile Safari",
				platform: "iPhone",
				language: "en-US",
				onLine: true,
				deviceMemory: undefined,
				hardwareConcurrency: 6,
				maxTouchPoints: 5,
				connectionEffectiveType: "4g",
				innerWidth: 390,
				innerHeight: 844,
				devicePixelRatio: 3,
				screenWidth: 1170,
				screenHeight: 2532,
				hasTouchStart: true,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Touch Device:** Yes");
		});

		it("detects touch device via maxTouchPoints", () => {
			const apis: BrowserAPIs = {
				userAgent: "Chrome Android",
				platform: "Linux armv8l",
				language: "en-US",
				onLine: true,
				deviceMemory: 4,
				hardwareConcurrency: 8,
				maxTouchPoints: 10,
				connectionEffectiveType: "4g",
				innerWidth: 360,
				innerHeight: 740,
				devicePixelRatio: 3,
				screenWidth: 1080,
				screenHeight: 2220,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Touch Device:** Yes");
		});

		it("detects PWA standalone mode", () => {
			const apis: BrowserAPIs = {
				userAgent: "Mobile Safari",
				platform: "iPhone",
				language: "en-US",
				onLine: true,
				deviceMemory: undefined,
				hardwareConcurrency: 6,
				maxTouchPoints: 5,
				connectionEffectiveType: undefined,
				innerWidth: 390,
				innerHeight: 844,
				devicePixelRatio: 3,
				screenWidth: 1170,
				screenHeight: 2532,
				hasTouchStart: true,
				isStandalone: true,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Display Mode:** standalone");
		});

		it("shows offline status", () => {
			const apis: BrowserAPIs = {
				userAgent: "Chrome",
				platform: "Win32",
				language: "en-US",
				onLine: false,
				deviceMemory: 8,
				hardwareConcurrency: 4,
				maxTouchPoints: 0,
				connectionEffectiveType: undefined,
				innerWidth: 1920,
				innerHeight: 1080,
				devicePixelRatio: 1,
				screenWidth: 1920,
				screenHeight: 1080,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Online Status:** Offline");
		});

		it("does not include pixel ratio suffix when ratio is 1", () => {
			const apis: BrowserAPIs = {
				userAgent: "Chrome",
				platform: "Win32",
				language: "en-US",
				onLine: true,
				deviceMemory: 8,
				hardwareConcurrency: 4,
				maxTouchPoints: 0,
				connectionEffectiveType: "4g",
				innerWidth: 1920,
				innerHeight: 1080,
				devicePixelRatio: 1,
				screenWidth: 1920,
				screenHeight: 1080,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Screen:** 1920x1080");
			expect(info).not.toContain("@1x");
		});

		it("includes pixel ratio suffix when ratio is not 1", () => {
			const apis: BrowserAPIs = {
				userAgent: "Chrome",
				platform: "MacIntel",
				language: "en-US",
				onLine: true,
				deviceMemory: 16,
				hardwareConcurrency: 8,
				maxTouchPoints: 0,
				connectionEffectiveType: "4g",
				innerWidth: 1680,
				innerHeight: 1050,
				devicePixelRatio: 2,
				screenWidth: 3360,
				screenHeight: 2100,
				hasTouchStart: false,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Screen:** 1680x1050 @2x");
		});

		it("detects mobile from user agent", () => {
			const apis: BrowserAPIs = {
				userAgent:
					"Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
				platform: "iPhone",
				language: "en-US",
				onLine: true,
				deviceMemory: undefined,
				hardwareConcurrency: 6,
				maxTouchPoints: 5,
				connectionEffectiveType: undefined,
				innerWidth: 390,
				innerHeight: 844,
				devicePixelRatio: 3,
				screenWidth: 1170,
				screenHeight: 2532,
				hasTouchStart: true,
				isStandalone: false,
			};

			const info = formatDeviceInfo(apis);
			expect(info).toContain("**Mobile:** Yes");
		});
	});

	describe("getBrowserAPIs", () => {
		it("returns BrowserAPIs object with all fields", () => {
			const apis = getBrowserAPIs();

			// Required fields should always be present
			expect(apis).toHaveProperty("userAgent");
			expect(apis).toHaveProperty("platform");
			expect(apis).toHaveProperty("language");
			expect(apis).toHaveProperty("onLine");
			expect(apis).toHaveProperty("innerWidth");
			expect(apis).toHaveProperty("innerHeight");
			expect(apis).toHaveProperty("devicePixelRatio");
			expect(apis).toHaveProperty("screenWidth");
			expect(apis).toHaveProperty("screenHeight");
			expect(apis).toHaveProperty("hasTouchStart");
			expect(apis).toHaveProperty("isStandalone");

			// Optional fields
			expect(apis).toHaveProperty("deviceMemory");
			expect(apis).toHaveProperty("hardwareConcurrency");
			expect(apis).toHaveProperty("maxTouchPoints");
			expect(apis).toHaveProperty("connectionEffectiveType");
		});

		it("returns valid values for dimensions", () => {
			const apis = getBrowserAPIs();

			expect(typeof apis.innerWidth).toBe("number");
			expect(typeof apis.innerHeight).toBe("number");
			expect(typeof apis.screenWidth).toBe("number");
			expect(typeof apis.screenHeight).toBe("number");
			expect(typeof apis.devicePixelRatio).toBe("number");

			// In test environment (jsdom), dimensions may be 0
			// In real browser, they should be > 0
			expect(apis.innerWidth).toBeGreaterThanOrEqual(0);
			expect(apis.innerHeight).toBeGreaterThanOrEqual(0);
			expect(apis.screenWidth).toBeGreaterThanOrEqual(0);
			expect(apis.screenHeight).toBeGreaterThanOrEqual(0);
			expect(apis.devicePixelRatio).toBeGreaterThan(0);
		});

		it("returns boolean for feature detection", () => {
			const apis = getBrowserAPIs();

			expect(typeof apis.hasTouchStart).toBe("boolean");
			expect(typeof apis.isStandalone).toBe("boolean");
			expect(typeof apis.onLine).toBe("boolean");
		});
	});

	describe("getDeviceInfo", () => {
		it("returns formatted device info string", () => {
			const info = getDeviceInfo();

			// Should contain all required sections
			expect(info).toContain("**Screen:**");
			expect(info).toContain("**Device Memory:**");
			expect(info).toContain("**CPU Cores:**");
			expect(info).toContain("**Online Status:**");
			expect(info).toContain("**Connection Type:**");
			expect(info).toContain("**Display Mode:**");
			expect(info).toContain("**Touch Device:**");
			expect(info).toContain("**Mobile:**");
			expect(info).toContain("**Platform:**");
			expect(info).toContain("**User Agent:**");
			expect(info).toContain("**Language:**");
		});

		it("returns a non-empty string", () => {
			const info = getDeviceInfo();
			expect(info.length).toBeGreaterThan(0);
		});
	});
});

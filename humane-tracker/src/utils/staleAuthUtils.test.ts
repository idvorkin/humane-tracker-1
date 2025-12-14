import { describe, expect, it } from "vitest";
import {
	didEnterStuckState,
	didExitStuckState,
	isStuckState,
} from "./staleAuthUtils";

describe("isStuckState", () => {
	it('returns true when phase is "initial" and status is "connected"', () => {
		expect(isStuckState({ phase: "initial", status: "connected" })).toBe(true);
	});

	it('returns false when phase is "initial" but status is not "connected"', () => {
		expect(isStuckState({ phase: "initial", status: "connecting" })).toBe(
			false,
		);
		expect(isStuckState({ phase: "initial", status: "not-started" })).toBe(
			false,
		);
		expect(isStuckState({ phase: "initial", status: "disconnected" })).toBe(
			false,
		);
	});

	it('returns false when status is "connected" but phase is not "initial"', () => {
		expect(isStuckState({ phase: "in-sync", status: "connected" })).toBe(false);
		expect(isStuckState({ phase: "pushing", status: "connected" })).toBe(false);
		expect(isStuckState({ phase: "pulling", status: "connected" })).toBe(false);
	});

	it("returns false for null values", () => {
		expect(isStuckState({ phase: null, status: null })).toBe(false);
		expect(isStuckState({ phase: "initial", status: null })).toBe(false);
		expect(isStuckState({ phase: null, status: "connected" })).toBe(false);
	});
});

describe("didEnterStuckState", () => {
	it("returns true when transitioning from connecting to connected (stuck)", () => {
		// This is the main bug fix test case:
		// Previous: initial + connecting (not stuck)
		// Current: initial + connected (stuck)
		// Should detect entering stuck state
		const previous = { phase: "initial", status: "connecting" };
		const current = { phase: "initial", status: "connected" };

		expect(didEnterStuckState(current, previous)).toBe(true);
	});

	it("returns true when transitioning from not-started to connected", () => {
		const previous = { phase: "initial", status: "not-started" };
		const current = { phase: "initial", status: "connected" };

		expect(didEnterStuckState(current, previous)).toBe(true);
	});

	it("returns false when already in stuck state (no transition)", () => {
		// If we were already stuck, don't re-trigger
		const previous = { phase: "initial", status: "connected" };
		const current = { phase: "initial", status: "connected" };

		expect(didEnterStuckState(current, previous)).toBe(false);
	});

	it("returns false when current state is not stuck", () => {
		const previous = { phase: "initial", status: "connecting" };
		const current = { phase: "in-sync", status: "connected" };

		expect(didEnterStuckState(current, previous)).toBe(false);
	});

	it("returns false when transitioning from stuck to in-sync", () => {
		// This is exiting, not entering
		const previous = { phase: "initial", status: "connected" };
		const current = { phase: "in-sync", status: "connected" };

		expect(didEnterStuckState(current, previous)).toBe(false);
	});

	it("returns false with null previous state", () => {
		const previous = { phase: null, status: null };
		const current = { phase: "initial", status: "connected" };

		// First time seeing stuck state, but we still want to detect it
		// Actually this SHOULD return true - entering from null is still entering
		expect(didEnterStuckState(current, previous)).toBe(true);
	});
});

describe("didExitStuckState", () => {
	it("returns true when exiting stuck state while tracking", () => {
		const current = { phase: "in-sync", status: "connected" };
		const wasTracking = true;

		expect(didExitStuckState(current, wasTracking)).toBe(true);
	});

	it("returns false when still in stuck state", () => {
		const current = { phase: "initial", status: "connected" };
		const wasTracking = true;

		expect(didExitStuckState(current, wasTracking)).toBe(false);
	});

	it("returns false when not tracking", () => {
		const current = { phase: "in-sync", status: "connected" };
		const wasTracking = false;

		expect(didExitStuckState(current, wasTracking)).toBe(false);
	});

	it("returns true when transitioning to pushing phase", () => {
		const current = { phase: "pushing", status: "connected" };
		const wasTracking = true;

		expect(didExitStuckState(current, wasTracking)).toBe(true);
	});

	it("returns true when transitioning to pulling phase", () => {
		const current = { phase: "pulling", status: "connected" };
		const wasTracking = true;

		expect(didExitStuckState(current, wasTracking)).toBe(true);
	});
});

describe("stale auth detection bug fix", () => {
	/**
	 * This test documents the bug that was fixed.
	 *
	 * The original code was:
	 *   const wasInStuckState = lastSyncPhase === "initial" && syncState.status === "connected";
	 *
	 * The bug: It used `syncState.status` (CURRENT status) instead of tracking
	 * the previous status. So when transitioning from "connecting" to "connected":
	 *   - isInStuckState = (phase="initial" && status="connected") = true
	 *   - wasInStuckState = (lastPhase="initial" && status="connected") = true (BUG!)
	 *   - isInStuckState && !wasInStuckState = false (timer never started)
	 *
	 * The fix: Track lastSyncStatus separately:
	 *   const wasInStuckState = lastSyncPhase === "initial" && lastSyncStatus === "connected";
	 */
	it("correctly detects transition that old buggy code missed", () => {
		// Simulate the state transition that the bug missed
		const states = [
			{ phase: "initial", status: "not-started" },
			{ phase: "initial", status: "connecting" },
			{ phase: "initial", status: "connected" }, // <-- Should trigger here!
		];

		// Old buggy behavior would never detect entering stuck state
		// because wasInStuckState always used current status
		let detectedEntry = false;
		for (let i = 1; i < states.length; i++) {
			if (didEnterStuckState(states[i], states[i - 1])) {
				detectedEntry = true;
			}
		}

		expect(detectedEntry).toBe(true);
	});
});

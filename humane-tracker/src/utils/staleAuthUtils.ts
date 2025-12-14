/**
 * Utilities for detecting stale auth state in Dexie Cloud.
 *
 * Stale auth occurs when:
 * - WebSocket is connected (for live notifications)
 * - But HTTP sync can't progress because the auth token is stale
 * - Sync gets stuck in "initial (connected)" phase indefinitely
 *
 * See: https://github.com/dexie/Dexie.js/issues/2225
 */

export interface SyncStateInfo {
	phase: string | null;
	status: string | null;
}

/**
 * Determine if the current sync state represents a "stuck" state
 * that may indicate stale auth.
 *
 * Stuck state = phase is "initial" AND status is "connected"
 * This means WebSocket connected but sync isn't progressing.
 */
export function isStuckState(state: SyncStateInfo): boolean {
	return state.phase === "initial" && state.status === "connected";
}

/**
 * Determine if we just ENTERED the stuck state (transition detection).
 *
 * Returns true only when:
 * - Current state IS stuck (initial + connected)
 * - Previous state was NOT stuck
 *
 * This is used to trigger the stale auth detection timer.
 *
 * BUG FIX: Previously this compared lastPhase to current status,
 * which meant the transition was never detected because both
 * used the current "connected" status value.
 */
export function didEnterStuckState(
	currentState: SyncStateInfo,
	previousState: SyncStateInfo,
): boolean {
	const isInStuckState = isStuckState(currentState);
	const wasInStuckState = isStuckState(previousState);
	return isInStuckState && !wasInStuckState;
}

/**
 * Determine if we just EXITED the stuck state.
 *
 * Returns true when:
 * - Current state is NOT stuck
 * - We were previously tracking a stuck state (stuckSince is set)
 *
 * This is used to cancel the stale auth detection timer.
 */
export function didExitStuckState(
	currentState: SyncStateInfo,
	wasTracking: boolean,
): boolean {
	return !isStuckState(currentState) && wasTracking;
}

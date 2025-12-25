/**
 * Format a duration in milliseconds to "M:SS" format.
 * Example: 65000ms -> "1:05"
 */
export function formatDurationMs(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format a duration in seconds to "M:SS" format.
 * Example: 65 -> "1:05"
 */
export function formatDurationSec(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get the trailing week date range (today and 6 days back).
 * Returns start date at 00:00:00.000 and end date at 23:59:59.999.
 * @throws Error if currentDate is invalid
 */
export function getTrailingWeekDateRange(currentDate: Date = new Date()): {
	startDate: Date;
	endDate: Date;
} {
	if (!(currentDate instanceof Date) || Number.isNaN(currentDate.getTime())) {
		throw new Error(
			"getTrailingWeekDateRange: currentDate must be a valid Date object",
		);
	}

	const endDate = new Date(currentDate);
	endDate.setHours(23, 59, 59, 999);

	const startDate = new Date(currentDate);
	startDate.setDate(startDate.getDate() - 6);
	startDate.setHours(0, 0, 0, 0);

	return { startDate, endDate };
}

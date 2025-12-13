/**
 * Get the trailing week date range (today and 6 days back).
 * Returns start date at 00:00:00.000 and end date at 23:59:59.999.
 */
export function getTrailingWeekDateRange(currentDate: Date = new Date()): {
	startDate: Date;
	endDate: Date;
} {
	const endDate = new Date(currentDate);
	endDate.setHours(23, 59, 59, 999);

	const startDate = new Date(currentDate);
	startDate.setDate(startDate.getDate() - 6);
	startDate.setHours(0, 0, 0, 0);

	return { startDate, endDate };
}

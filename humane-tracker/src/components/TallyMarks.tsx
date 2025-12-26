interface TallyMarksProps {
	count: number;
	maxVisible?: number;
}

// Scribbly variations for hand-drawn look
const MARK_ROTATIONS = [-8, 3, -5, 7, -3]; // degrees of rotation per mark
const MARK_HEIGHTS = [14, 13, 15, 13, 14]; // pixel heights per mark

/**
 * Small tally marks showing count - prison-wall style with hand-drawn look.
 * Shows up to 4 vertical lines per group, with a diagonal strike as the 5th mark.
 */
export function TallyMarks({ count, maxVisible = 10 }: TallyMarksProps) {
	// Show empty placeholder when count is 0
	if (count <= 0) {
		return (
			<div className="tally-marks tally-empty">
				<span className="tally-placeholder">○</span>
			</div>
		);
	}

	const displayCount = Math.min(count, maxVisible);
	const groups: number[] = [];

	// Split into groups of 5
	let remaining = displayCount;
	while (remaining > 0) {
		groups.push(Math.min(remaining, 5));
		remaining -= 5;
	}

	return (
		<div className="tally-marks">
			{groups.map((groupCount, groupIdx) => (
				<svg
					key={groupIdx}
					className="tally-group-svg"
					viewBox="0 0 24 18"
					width="24"
					height="18"
				>
					{/* Vertical marks */}
					{Array.from({ length: Math.min(groupCount, 4) }).map((_, i) => (
						<line
							key={i}
							x1={4 + i * 5}
							y1={2 + (16 - MARK_HEIGHTS[i]) / 2}
							x2={
								4 +
								i * 5 +
								Math.sin((MARK_ROTATIONS[i] * Math.PI) / 180) * MARK_HEIGHTS[i]
							}
							y2={2 + (16 - MARK_HEIGHTS[i]) / 2 + MARK_HEIGHTS[i]}
							className="tally-mark-line"
							strokeLinecap="round"
						/>
					))}
					{/* Diagonal strike for 5th */}
					{groupCount === 5 && (
						<line
							x1={1}
							y1={14}
							x2={22}
							y2={3}
							className="tally-strike-line"
							strokeLinecap="round"
						/>
					)}
				</svg>
			))}
			{count > maxVisible && (
				<span className="tally-overflow">+{count - maxVisible}</span>
			)}
		</div>
	);
}

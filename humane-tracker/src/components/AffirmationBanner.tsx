import { useMemo } from "react";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import "./AffirmationBanner.css";

export function AffirmationBanner() {
	const affirmation = useMemo(() => {
		const index = Math.floor(Math.random() * DEFAULT_AFFIRMATIONS.length);
		return DEFAULT_AFFIRMATIONS[index];
	}, []);

	return (
		<div className="affirmation-banner">
			<span className="affirmation-icon">✨</span>
			<div className="affirmation-content">
				<span className="affirmation-title">{affirmation.title}:</span>
				<span className="affirmation-subtitle">{affirmation.subtitle}</span>
			</div>
		</div>
	);
}

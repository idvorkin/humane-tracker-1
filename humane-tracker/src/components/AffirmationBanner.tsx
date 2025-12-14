import { useMemo } from "react";
import "./AffirmationBanner.css";

const DEFAULT_AFFIRMATIONS = [
	{
		title: "Do It Anyways",
		subtitle: "Deliberate. Disciplined. Daily.",
	},
	{
		title: "An Essentialist",
		subtitle: "Know Essential. Provide Context. Prioritize Ruthlessly.",
	},
	{
		title: "A Class Act",
		subtitle: "First Understand. Appreciate. Isn't that Curious.",
	},
	{
		title: "Calm Like Water",
		subtitle: "Be Present. This too shall pass. Work the problem.",
	},
];

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

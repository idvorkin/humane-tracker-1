import type React from "react";
import type { LocalDataSummary, SignInChoice } from "../utils/authUtils";
import "./SignInDialog.css";

interface SignInDialogProps {
	summary: LocalDataSummary;
	onChoice: (choice: SignInChoice) => void;
}

export const SignInDialog: React.FC<SignInDialogProps> = ({
	summary,
	onChoice,
}) => {
	const { habitCount, entryCount, habitNames } = summary;
	const moreHabits = habitCount > 5 ? habitCount - 5 : 0;

	return (
		<div
			className="signin-dialog-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="signin-dialog-title"
		>
			<div className="signin-dialog">
				<h2 id="signin-dialog-title">You have local data</h2>
				<p>
					You've created habits while not signed in. What would you like to do
					with this data when you sign in?
				</p>

				<div className="signin-dialog-summary">
					<div className="signin-dialog-stat">
						<span className="signin-dialog-stat-value">{habitCount}</span>
						<span className="signin-dialog-stat-label">
							habit{habitCount !== 1 ? "s" : ""}
						</span>
					</div>
					<div className="signin-dialog-stat">
						<span className="signin-dialog-stat-value">{entryCount}</span>
						<span className="signin-dialog-stat-label">
							entr{entryCount !== 1 ? "ies" : "y"}
						</span>
					</div>
				</div>

				<div className="signin-dialog-habits">
					{habitNames.map((name, idx) => (
						<span key={`${name}-${idx}`} className="signin-dialog-habit-tag">
							{name}
						</span>
					))}
					{moreHabits > 0 && (
						<span className="signin-dialog-habit-more">+{moreHabits} more</span>
					)}
				</div>

				<div className="signin-dialog-options">
					<button
						className="signin-dialog-btn signin-dialog-btn-merge"
						onClick={() => onChoice("merge")}
					>
						<span className="signin-dialog-btn-title">Merge Data</span>
						<span className="signin-dialog-btn-desc">
							Keep these {habitCount} habit{habitCount !== 1 ? "s" : ""} and
							combine with your account
						</span>
					</button>

					<button
						className="signin-dialog-btn signin-dialog-btn-abandon"
						onClick={() => onChoice("abandon")}
					>
						<span className="signin-dialog-btn-title">Start Fresh</span>
						<span className="signin-dialog-btn-desc">
							Delete local data and use only your account habits
						</span>
					</button>
				</div>

				<button
					className="signin-dialog-cancel"
					onClick={() => onChoice("cancel")}
				>
					Cancel
				</button>
			</div>
		</div>
	);
};

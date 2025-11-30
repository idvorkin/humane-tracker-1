import { useState } from "react";

function CrashingComponent(): null {
	// This will crash during render
	throw new Error("Test crash - triggered manually from dev menu");
}

export function CrashTestButton() {
	const [shouldCrash, setShouldCrash] = useState(false);

	if (shouldCrash) {
		return <CrashingComponent />;
	}

	return (
		<button
			className="user-menu-item user-menu-crash-test"
			onClick={() => setShouldCrash(true)}
			style={{ color: "#ef4444" }}
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="M8 2L2 14h12L8 2z" />
				<path d="M8 6v4M8 11h.01" />
			</svg>
			Trigger Crash (Dev)
		</button>
	);
}

import { useState } from "react";
import { WarningIcon } from "./icons/MenuIcons";

function CrashingComponent(): null {
	throw new Error("Test crash - triggered manually from dev menu");
}

interface CrashTestButtonProps {
	className?: string;
}

export function CrashTestButton({ className }: CrashTestButtonProps) {
	const [shouldCrash, setShouldCrash] = useState(false);

	if (shouldCrash) {
		return <CrashingComponent />;
	}

	return (
		<button
			className={className || "user-menu-item user-menu-crash-test"}
			onClick={() => setShouldCrash(true)}
		>
			<WarningIcon size={16} />
			Trigger Crash (Dev)
		</button>
	);
}

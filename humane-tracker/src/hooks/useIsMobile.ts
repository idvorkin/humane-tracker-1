import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.innerWidth < MOBILE_BREAKPOINT;
	});

	useEffect(() => {
		const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

		const handleChange = (e: MediaQueryListEvent) => {
			setIsMobile(e.matches);
		};

		// Set initial value
		setIsMobile(query.matches);

		// Listen for changes
		query.addEventListener("change", handleChange);
		return () => query.removeEventListener("change", handleChange);
	}, []);

	return isMobile;
}

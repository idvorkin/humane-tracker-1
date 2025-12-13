import { useCallback, useEffect, useState } from "react";
import { db } from "../config/db";
import "./StaleAuthNotification.css";

interface StaleAuthEventDetail {
	pendingMutationCount: number;
	stuckDuration: number;
	message: string;
}

export function StaleAuthNotification() {
	const [notification, setNotification] = useState<StaleAuthEventDetail | null>(
		null,
	);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		const handleStaleAuth = (event: Event) => {
			const customEvent = event as CustomEvent<StaleAuthEventDetail>;
			setNotification(customEvent.detail);
		};

		window.addEventListener("dexie-cloud-stale-auth", handleStaleAuth);

		return () => {
			window.removeEventListener("dexie-cloud-stale-auth", handleStaleAuth);
		};
	}, []);

	const handleRelogin = useCallback(async () => {
		setIsLoggingOut(true);
		try {
			// Log out and let user log back in
			await db.cloud.logout();
			// After logout, the app will show login UI
			setNotification(null);
		} catch (error) {
			console.error("Error during re-login:", error);
			setIsLoggingOut(false);
		}
	}, []);

	const handleDismiss = useCallback(() => {
		setNotification(null);
	}, []);

	if (!notification) {
		return null;
	}

	return (
		<div className="stale-auth-notification">
			<div className="stale-auth-content">
				<div className="stale-auth-icon">⚠️</div>
				<div className="stale-auth-message">
					<strong>Sync Issue Detected</strong>
					<p>
						{notification.pendingMutationCount} change
						{notification.pendingMutationCount !== 1 ? "s" : ""} waiting to
						sync. Your session may have expired.
					</p>
				</div>
				<div className="stale-auth-actions">
					<button
						className="stale-auth-btn-primary"
						onClick={handleRelogin}
						disabled={isLoggingOut}
					>
						{isLoggingOut ? "Logging out..." : "Re-login"}
					</button>
					<button className="stale-auth-btn-secondary" onClick={handleDismiss}>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	);
}

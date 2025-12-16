import { useCallback, useEffect, useState } from "react";
import { isMacPlatform, openBugReport } from "../services/githubService";
import { useShakeDetector } from "./useShakeDetector";

const SHAKE_ENABLED_KEY = "bugReporter.shakeEnabled";

interface UseBugReporterOptions {
	/** Whether bug reporter is active (e.g., dialog is open) */
	isOpen?: boolean;
}

interface UseBugReporterReturn {
	// Dialog state
	isOpen: boolean;
	open: () => void;
	close: () => void;

	// Form state
	title: string;
	setTitle: (title: string) => void;
	description: string;
	setDescription: (description: string) => void;
	includeMetadata: boolean;
	setIncludeMetadata: (include: boolean) => void;

	// Screenshot
	screenshot: string | null;
	isCapturingScreenshot: boolean;
	captureScreenshot: () => Promise<void>;
	clearScreenshot: () => void;
	screenshotSupported: boolean;
	isMobile: boolean;

	// Submission
	isSubmitting: boolean;
	submit: () => Promise<void>;
	error: string | null;

	// Shake detection settings
	shakeEnabled: boolean;
	setShakeEnabled: (enabled: boolean) => void;
	shakeSupported: boolean;
	shakeHasPermission: boolean;
	requestShakePermission: () => Promise<boolean>;
}

/**
 * Hook to manage bug report form state and submission
 * Also handles shake detection and keyboard shortcuts
 */
export function useBugReporter(
	options: UseBugReporterOptions = {},
): UseBugReporterReturn {
	// Dialog visibility
	const [isOpen, setIsOpen] = useState(options.isOpen ?? false);

	// Form fields
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [includeMetadata, setIncludeMetadata] = useState(true);

	// Screenshot state
	const [screenshot, setScreenshot] = useState<string | null>(null);
	const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

	// Detect mobile device
	const isMobile =
		typeof navigator !== "undefined" &&
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent,
		);

	// Check if screenshot capture is supported (desktop only with getDisplayMedia)
	const screenshotSupported =
		typeof navigator !== "undefined" &&
		"mediaDevices" in navigator &&
		"getDisplayMedia" in navigator.mediaDevices &&
		!isMobile;

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Shake detection preference (persisted)
	const [shakeEnabled, setShakeEnabledState] = useState(() => {
		try {
			return localStorage.getItem(SHAKE_ENABLED_KEY) === "true";
		} catch {
			return false;
		}
	});

	// Shake detector
	const {
		isSupported: shakeSupported,
		hasPermission: shakeHasPermission,
		requestPermission: requestShakePermission,
	} = useShakeDetector({
		enabled: shakeEnabled && !isOpen,
		onShake: () => setIsOpen(true),
	});

	// Persist shake preference
	const setShakeEnabled = useCallback((enabled: boolean) => {
		setShakeEnabledState(enabled);
		try {
			localStorage.setItem(SHAKE_ENABLED_KEY, String(enabled));
		} catch {
			// Ignore storage errors
		}
	}, []);

	// Keyboard shortcut handler (Ctrl/Cmd+I)
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Check for Ctrl+I (Windows/Linux) or Cmd+I (Mac)
			const modifier = isMacPlatform() ? event.metaKey : event.ctrlKey;

			if (modifier && event.key.toLowerCase() === "i" && !event.shiftKey) {
				event.preventDefault();
				setIsOpen(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Screenshot capture (desktop only)
	const captureScreenshot = useCallback(async () => {
		if (!screenshotSupported) return;

		setIsCapturingScreenshot(true);

		try {
			// Request screen capture with fallback for browsers that don't support displaySurface
			let stream: MediaStream;
			try {
				stream = await navigator.mediaDevices.getDisplayMedia({
					video: { displaySurface: "browser" } as MediaTrackConstraints,
				});
			} catch {
				// Fallback to basic video capture if displaySurface constraint fails
				stream = await navigator.mediaDevices.getDisplayMedia({
					video: true,
				});
			}

			// Create video element to capture frame
			const video = document.createElement("video");
			video.srcObject = stream;
			await video.play();

			// Draw frame to canvas
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");

			// Validate canvas context was created successfully
			if (!ctx) {
				throw new Error("Failed to create canvas context");
			}

			ctx.drawImage(video, 0, 0);

			// Clean up video element
			video.pause();
			video.srcObject = null;

			// Stop all tracks immediately
			for (const track of stream.getTracks()) {
				track.stop();
			}

			// Convert to data URL
			const dataUrl = canvas.toDataURL("image/png");
			setScreenshot(dataUrl);
		} catch (err) {
			// User cancelled or permission denied - not an error
			console.log("Screenshot capture cancelled or failed:", err);
		} finally {
			setIsCapturingScreenshot(false);
		}
	}, [screenshotSupported]);

	const clearScreenshot = useCallback(() => {
		setScreenshot(null);
	}, []);

	// Open/close handlers
	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => {
		setIsOpen(false);
		// Reset form on close
		setTitle("");
		setDescription("");
		setIncludeMetadata(true);
		setScreenshot(null);
		setError(null);
	}, []);

	// Submit handler
	const submit = useCallback(async () => {
		if (!title.trim() && !description.trim()) {
			setError("Please provide a title or description");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			await openBugReport({
				title: title.trim() || "Bug Report",
				description: description.trim(),
				includeMetadata,
				screenshot: screenshot ?? undefined,
			});
			close();
		} catch (err) {
			console.error("Failed to open bug report:", err);
			setError("Failed to open GitHub. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}, [title, description, includeMetadata, screenshot, close]);

	return {
		// Dialog state
		isOpen,
		open,
		close,

		// Form state
		title,
		setTitle,
		description,
		setDescription,
		includeMetadata,
		setIncludeMetadata,

		// Screenshot
		screenshot,
		isCapturingScreenshot,
		captureScreenshot,
		clearScreenshot,
		screenshotSupported,
		isMobile,

		// Submission
		isSubmitting,
		submit,
		error,

		// Shake detection
		shakeEnabled,
		setShakeEnabled,
		shakeSupported,
		shakeHasPermission,
		requestShakePermission,
	};
}

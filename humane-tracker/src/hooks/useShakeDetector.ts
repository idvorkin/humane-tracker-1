import { useCallback, useEffect, useRef, useState } from "react";

// Default shake detection parameters
/** Acceleration threshold in m/s² to trigger shake detection */
const DEFAULT_SHAKE_THRESHOLD = 25;
/** Cooldown in ms between shake detections to prevent rapid triggering */
const DEFAULT_SHAKE_COOLDOWN_MS = 2000;

interface UseShakeDetectorOptions {
	/** Threshold in m/s² to trigger shake detection (default: 25) */
	threshold?: number;
	/** Cooldown in ms between shake detections (default: 2000) */
	cooldownMs?: number;
	/** Whether shake detection is enabled (default: false) */
	enabled?: boolean;
	/** Callback when shake is detected */
	onShake?: () => void;
}

interface UseShakeDetectorReturn {
	/** Whether the device supports motion detection */
	isSupported: boolean;
	/** Whether we have permission to use motion detection */
	hasPermission: boolean;
	/** Request permission for motion detection (iOS 13+) */
	requestPermission: () => Promise<boolean>;
	/** Last detected shake timestamp */
	lastShakeTime: number | null;
}

/**
 * Hook to detect device shake gestures for mobile bug reporting
 * Uses DeviceMotion API with acceleration data
 */
export function useShakeDetector({
	threshold = DEFAULT_SHAKE_THRESHOLD,
	cooldownMs = DEFAULT_SHAKE_COOLDOWN_MS,
	enabled = false,
	onShake,
}: UseShakeDetectorOptions = {}): UseShakeDetectorReturn {
	const [isSupported, setIsSupported] = useState(false);
	const [hasPermission, setHasPermission] = useState(false);
	const [lastShakeTime, setLastShakeTime] = useState<number | null>(null);

	const lastShakeRef = useRef<number>(0);
	const onShakeRef = useRef(onShake);
	onShakeRef.current = onShake;

	// Check if device motion is supported
	useEffect(() => {
		const supported =
			typeof window !== "undefined" && "DeviceMotionEvent" in window;
		setIsSupported(supported);

		// On Android and older iOS, permission is granted by default
		if (
			supported &&
			typeof (
				DeviceMotionEvent as unknown as {
					requestPermission?: () => Promise<string>;
				}
			).requestPermission !== "function"
		) {
			setHasPermission(true);
		}
	}, []);

	// Request permission for iOS 13+
	const requestPermission = useCallback(async (): Promise<boolean> => {
		if (!isSupported) return false;

		const DeviceMotionEventTyped = DeviceMotionEvent as unknown as {
			requestPermission?: () => Promise<string>;
		};

		if (typeof DeviceMotionEventTyped.requestPermission === "function") {
			try {
				const permission = await DeviceMotionEventTyped.requestPermission();
				const granted = permission === "granted";
				setHasPermission(granted);
				return granted;
			} catch (error) {
				console.error("Failed to request motion permission:", error);
				return false;
			}
		}

		// Permission not required (Android, older iOS)
		setHasPermission(true);
		return true;
	}, [isSupported]);

	// Handle device motion events
	useEffect(() => {
		if (!enabled || !isSupported || !hasPermission) return;

		const handleMotion = (event: DeviceMotionEvent) => {
			// Prefer acceleration without gravity for cleaner readings
			const acceleration =
				event.accelerationIncludingGravity || event.acceleration;
			if (!acceleration) return;

			const { x, y, z } = acceleration;
			if (x === null || y === null || z === null) return;

			// Calculate magnitude of acceleration
			const magnitude = Math.sqrt(x * x + y * y + z * z);

			// Check if magnitude exceeds threshold
			if (magnitude > threshold) {
				const now = Date.now();

				// Apply cooldown
				if (now - lastShakeRef.current > cooldownMs) {
					lastShakeRef.current = now;
					setLastShakeTime(now);
					onShakeRef.current?.();
				}
			}
		};

		window.addEventListener("devicemotion", handleMotion);
		return () => window.removeEventListener("devicemotion", handleMotion);
	}, [enabled, isSupported, hasPermission, threshold, cooldownMs]);

	return {
		isSupported,
		hasPermission,
		requestPermission,
		lastShakeTime,
	};
}

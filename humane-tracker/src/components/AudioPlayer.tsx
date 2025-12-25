import { useCallback, useEffect, useRef, useState } from "react";
import { formatDurationSec } from "../utils/dateUtils";
import "./AudioPlayer.css";

interface AudioPlayerProps {
	blob: Blob;
	mimeType: string;
	onDelete?: () => void;
}

export function AudioPlayer({ blob, mimeType, onDelete }: AudioPlayerProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);

	// Create object URL for the blob
	useEffect(() => {
		const url = URL.createObjectURL(blob);
		setAudioUrl(url);

		return () => {
			URL.revokeObjectURL(url);
		};
	}, [blob]);

	// Set up audio element event handlers
	// Re-run when audioUrl changes because audio element is conditionally rendered
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime);
		};

		const handleDurationChange = () => {
			if (Number.isFinite(audio.duration)) {
				setDuration(audio.duration);
			}
		};

		const handleEnded = () => {
			setIsPlaying(false);
			setCurrentTime(0);
		};

		const handleError = () => {
			setError("Failed to load audio");
			setIsPlaying(false);
		};

		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("durationchange", handleDurationChange);
		audio.addEventListener("loadedmetadata", handleDurationChange);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		return () => {
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("durationchange", handleDurationChange);
			audio.removeEventListener("loadedmetadata", handleDurationChange);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, [audioUrl]);

	const handlePlayPause = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
			setIsPlaying(false);
		} else {
			audio.play().catch(() => {
				setError("Failed to play audio");
			});
			setIsPlaying(true);
		}
	}, [isPlaying]);

	const handleSeek = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const audio = audioRef.current;
			if (!audio) return;

			const newTime = (Number.parseFloat(e.target.value) / 100) * duration;
			audio.currentTime = newTime;
			setCurrentTime(newTime);
		},
		[duration],
	);

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	if (error) {
		return (
			<div className="audio-player audio-player-error">
				<span className="audio-player-error-text">{error}</span>
			</div>
		);
	}

	return (
		<div className="audio-player">
			{audioUrl && (
				<audio ref={audioRef} src={audioUrl} preload="metadata">
					<track kind="captions" />
				</audio>
			)}

			<button
				type="button"
				className="audio-player-play"
				onClick={handlePlayPause}
				aria-label={isPlaying ? "Pause" : "Play"}
			>
				{isPlaying ? "\u275A\u275A" : "\u25B6"}
			</button>

			<div className="audio-player-progress-container">
				<input
					type="range"
					className="audio-player-progress"
					min="0"
					max="100"
					value={progress}
					onChange={handleSeek}
					aria-label="Seek"
				/>
			</div>

			<span className="audio-player-time">
				{formatDurationSec(currentTime)} / {formatDurationSec(duration)}
			</span>

			{onDelete && (
				<button
					type="button"
					className="audio-player-delete"
					onClick={onDelete}
					aria-label="Delete recording"
				>
					{"\u2715"}
				</button>
			)}
		</div>
	);
}

import type React from "react";
import "./BugReportDialog.css";

interface BugReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	setTitle: (title: string) => void;
	description: string;
	setDescription: (description: string) => void;
	includeMetadata: boolean;
	setIncludeMetadata: (include: boolean) => void;
	isSubmitting: boolean;
	onSubmit: () => void;
	error: string | null;
}

export function BugReportDialog({
	isOpen,
	onClose,
	title,
	setTitle,
	description,
	setDescription,
	includeMetadata,
	setIncludeMetadata,
	isSubmitting,
	onSubmit,
	error,
}: BugReportDialogProps) {
	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	const isMac =
		typeof navigator !== "undefined" &&
		navigator.platform.toUpperCase().indexOf("MAC") >= 0;
	const shortcutKey = isMac ? "Cmd" : "Ctrl";

	return (
		<div className="bug-report-overlay" onClick={handleOverlayClick}>
			<div className="bug-report-dialog">
				<div className="bug-report-header">
					<div className="bug-report-header-content">
						<div className="bug-report-icon">
							<svg
								width="20"
								height="20"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							>
								<path d="M10 2a5 5 0 015 5v1h2v2h-2v1a5 5 0 01-10 0v-1H3V8h2V7a5 5 0 015-5z" />
								<path d="M8 8h4M8 11h4" />
								<circle cx="7" cy="5" r="1" />
								<circle cx="13" cy="5" r="1" />
							</svg>
						</div>
						<h2>Report a Bug</h2>
					</div>
					<button
						className="bug-report-close"
						onClick={onClose}
						aria-label="Close"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M5 5l10 10M15 5L5 15" />
						</svg>
					</button>
				</div>

				<form className="bug-report-body" onSubmit={handleSubmit}>
					<div className="bug-report-field">
						<label htmlFor="bug-title">Title</label>
						<input
							id="bug-title"
							type="text"
							placeholder="Brief summary of the issue"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							autoFocus
						/>
					</div>

					<div className="bug-report-field">
						<label htmlFor="bug-description">Description</label>
						<textarea
							id="bug-description"
							placeholder="What happened? What did you expect to happen?"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={4}
						/>
					</div>

					<label className="bug-report-checkbox">
						<input
							type="checkbox"
							checked={includeMetadata}
							onChange={(e) => setIncludeMetadata(e.target.checked)}
						/>
						<span className="bug-report-checkbox-mark">
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M2 6l3 3 5-5" />
							</svg>
						</span>
						<span className="bug-report-checkbox-label">
							Include device info (helps us fix the bug faster)
						</span>
					</label>

					{error && <div className="bug-report-error">{error}</div>}

					<div className="bug-report-actions">
						<button
							type="button"
							className="bug-report-btn bug-report-btn-secondary"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="bug-report-btn bug-report-btn-primary"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<span className="bug-report-spinner" />
									Opening...
								</>
							) : (
								<>
									<svg
										width="16"
										height="16"
										viewBox="0 0 16 16"
										fill="currentColor"
									>
										<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
									</svg>
									Open in GitHub
								</>
							)}
						</button>
					</div>
				</form>

				<div className="bug-report-footer">
					<span className="bug-report-hint">
						Tip: Press <kbd>{shortcutKey}</kbd>+<kbd>I</kbd> anywhere to report
						a bug
					</span>
				</div>
			</div>
		</div>
	);
}

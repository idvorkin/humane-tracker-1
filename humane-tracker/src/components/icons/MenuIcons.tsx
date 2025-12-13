import type React from "react";

interface IconProps {
	size?: number;
	className?: string;
}

type IconComponent = React.FC<IconProps>;

export const ChevronIcon: IconComponent = ({ size = 12, className }) => (
	<svg
		className={className}
		width={size}
		height={size}
		viewBox="0 0 12 12"
		fill="none"
	>
		<path
			d="M3 4.5L6 7.5L9 4.5"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const SettingsIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<circle cx="8" cy="8" r="2.5" />
		<path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.17 3.17l1.06 1.06M11.77 11.77l1.06 1.06M3.17 12.83l1.06-1.06M11.77 4.23l1.06-1.06" />
	</svg>
);

export const ManageHabitsIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<circle cx="8" cy="8" r="3" />
		<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
	</svg>
);

export const DownloadIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M8 1v10M4 7l4 4 4-4M2 14h12" />
	</svg>
);

export const SignOutIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" />
	</svg>
);

export const SignInIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M10 14h3a1 1 0 001-1V3a1 1 0 00-1-1h-3M6 11l-3-3 3-3M2 8h8" />
	</svg>
);

export const InfoIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<circle cx="8" cy="8" r="6" />
		<path d="M8 11V8M8 5h.01" />
	</svg>
);

export const BugIcon: IconComponent = ({ size = 16 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M8 1.5a4 4 0 014 4v1h1.5v1.5H12v1a4 4 0 01-8 0v-1H2.5V6.5H4v-1a4 4 0 014-4z" />
		<path d="M6.5 6.5h3M6.5 9h3" />
	</svg>
);

export const CloseIcon: IconComponent = ({ size = 20 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 20 20"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	>
		<path d="M5 5l10 10M15 5L5 15" />
	</svg>
);

export const SyncIcon: IconComponent = ({ size = 18 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M1 9a8 8 0 0114.9-4M17 9a8 8 0 01-14.9 4" />
		<path d="M1 5V9h4M17 13V9h-4" />
	</svg>
);

export const UpdateIcon: IconComponent = ({ size = 18 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M9 1v4M9 13v4M1 9h4M13 9h4" />
		<circle cx="9" cy="9" r="4" />
	</svg>
);

export const GitHubIcon: IconComponent = ({ size = 16 }) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
		<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
	</svg>
);

export const WarningIcon: IconComponent = ({ size = 18 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="M9 6v4M9 13h.01" />
		<path d="M8.13 2.5a1 1 0 011.74 0l6.4 11.2a1 1 0 01-.87 1.5H2.6a1 1 0 01-.87-1.5l6.4-11.2z" />
	</svg>
);

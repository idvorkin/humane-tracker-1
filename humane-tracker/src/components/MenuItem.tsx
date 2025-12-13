import type React from "react";

interface MenuItemProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	variant?: "default" | "danger";
	className?: string;
}

export function MenuItem({
	icon,
	label,
	onClick,
	variant = "default",
	className = "",
}: MenuItemProps) {
	const variantClass = variant === "danger" ? "user-menu-signout" : "";

	return (
		<button
			className={`user-menu-item ${variantClass} ${className}`.trim()}
			onClick={onClick}
		>
			{icon}
			{label}
		</button>
	);
}

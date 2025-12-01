import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Custom warm amber/terracotta primary color palette
const warmAmber: MantineColorsTuple = [
	"#fff9e6",
	"#fff3cc",
	"#ffe299",
	"#ffd066",
	"#ffc033",
	"#fbbf24", // amber-glow (index 5 - primary)
	"#d97706", // amber (index 6)
	"#b45309",
	"#92400e",
	"#78350f",
];

// Terracotta/warm secondary
const terracotta: MantineColorsTuple = [
	"#fff1ed",
	"#ffe2db",
	"#ffc3b3",
	"#ff9f85",
	"#ea6c4f",
	"#c2410c", // terracotta main
	"#a13008",
	"#832506",
	"#6b1f05",
	"#571903",
];

// Sage green for success
const sage: MantineColorsTuple = [
	"#f7fee7",
	"#ecfccb",
	"#d9f99d",
	"#bef264",
	"#a3e635",
	"#84cc16", // sage-light (index 5)
	"#4d7c0f", // sage (index 6)
	"#3f6212",
	"#365314",
	"#1a2e05",
];

// Warm dark background tones
const warmDark: MantineColorsTuple = [
	"#faf7f2", // cream
	"#f0ebe3", // cream-dark
	"#e8e0d5", // parchment
	"#9c9489", // warm-gray
	"#3d3a36", // charcoal
	"#2a2825", // espresso
	"#1f1d1a", // deep-brown
	"#181613",
	"#121110",
	"#0c0b0a",
];

export const mantineTheme = createTheme({
	// Use warm, cozy color scheme
	primaryColor: "warmAmber",
	colors: {
		warmAmber,
		terracotta,
		sage,
		warmDark,
	},

	// Font families matching the existing design
	fontFamily: "'DM Sans', -apple-system, sans-serif",
	headings: {
		fontFamily: "'Fraunces', Georgia, serif",
		fontWeight: "500",
	},

	// Border radius
	radius: {
		xs: "6px",
		sm: "10px",
		md: "16px",
		lg: "24px",
		xl: "32px",
	},

	// Spacing
	spacing: {
		xs: "4px",
		sm: "8px",
		md: "16px",
		lg: "24px",
		xl: "32px",
	},

	// Component defaults
	components: {
		Button: {
			defaultProps: {
				radius: "md",
			},
		},
		Modal: {
			defaultProps: {
				radius: "lg",
				overlayProps: {
					opacity: 0.7,
					blur: 3,
				},
			},
		},
		Card: {
			defaultProps: {
				radius: "lg",
				shadow: "md",
			},
		},
		Paper: {
			defaultProps: {
				radius: "lg",
			},
		},
		Table: {
			defaultProps: {
				striped: false,
				highlightOnHover: true,
			},
		},
	},
});

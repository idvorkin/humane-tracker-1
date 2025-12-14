export interface DefaultHabit {
	name: string;
	category: string;
	targetPerWeek: number;
	habitType?: "raw" | "tag";
	/** For tags: names of child habits (resolved to IDs after creation) */
	childNames?: string[];
}

export const DEFAULT_HABITS: DefaultHabit[] = [
	// Mobility
	{ name: "Physical Mobility", category: "Mobility", targetPerWeek: 5 },
	{ name: "Back Twists", category: "Mobility", targetPerWeek: 3 },
	{ name: "Shin Boxes", category: "Mobility", targetPerWeek: 3 },
	// Shoulder Accessory is now a TAG that groups specific exercises
	{
		name: "Shoulder Accessory",
		category: "Mobility",
		targetPerWeek: 3,
		habitType: "tag",
		childNames: ["Shoulder Y", "Wall Slide", "Shoulder W", "Swimmers"],
	},
	// Individual shoulder exercises (children of the tag)
	{ name: "Shoulder Y", category: "Mobility", targetPerWeek: 2 },
	{ name: "Wall Slide", category: "Mobility", targetPerWeek: 2 },
	{ name: "Shoulder W", category: "Mobility", targetPerWeek: 2 },
	{ name: "Swimmers", category: "Mobility", targetPerWeek: 2 },
	{ name: "Side Planks", category: "Mobility", targetPerWeek: 2 },
	{ name: "Heavy Clubs 3x10", category: "Mobility", targetPerWeek: 2 },
	{ name: "Half Lotus", category: "Mobility", targetPerWeek: 2 },
	{ name: "Biking", category: "Mobility", targetPerWeek: 2 },

	// Relationships
	{ name: "Tori Act Of Service", category: "Relationships", targetPerWeek: 2 },
	{ name: "Zach Time", category: "Relationships", targetPerWeek: 2 },
	{ name: "Amelia Time", category: "Relationships", targetPerWeek: 2 },

	// Emotional Health
	{ name: "Cult Meditate", category: "Emotional Health", targetPerWeek: 3 },
	{ name: "Box Breathing", category: "Emotional Health", targetPerWeek: 3 },

	// Smile and Wonder
	{ name: "Juggling", category: "Smile and Wonder", targetPerWeek: 2 },
	{ name: "Publish Reel", category: "Smile and Wonder", targetPerWeek: 2 },
	{ name: "Magic Practice", category: "Smile and Wonder", targetPerWeek: 3 },
	{
		name: "Magic Trick for Other",
		category: "Smile and Wonder",
		targetPerWeek: 1,
	},
	{ name: "Daily Selfie", category: "Smile and Wonder", targetPerWeek: 7 },
	{ name: "Hand Out Balloon", category: "Smile and Wonder", targetPerWeek: 5 },

	// Physical Health
	{ name: "TGU 28KG", category: "Physical Health", targetPerWeek: 2 },
	{ name: "TGU 32KG", category: "Physical Health", targetPerWeek: 1 },
	{ name: "1H Swings - 28 KG", category: "Physical Health", targetPerWeek: 2 },
	{ name: "1H Swings - 32 KG", category: "Physical Health", targetPerWeek: 1 },
	{ name: "Pistols", category: "Physical Health", targetPerWeek: 2 },
	{ name: "L-Sit Hangs", category: "Physical Health", targetPerWeek: 2 },
	{ name: "Pull Ups", category: "Physical Health", targetPerWeek: 3 },
	{
		name: "Kettlebility Class3e/6e",
		category: "Physical Health",
		targetPerWeek: 2,
	},
];

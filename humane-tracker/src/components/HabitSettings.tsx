import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHabitService } from "../hooks/useHabitService";
import {
	type ExportData,
	exportAllData,
	generateExportFilename,
	importAllData,
	validateExportData,
} from "../services/dataService";
import type { Habit, HabitType } from "../types/habit";
import {
	buildCategoryInfo,
	extractCategories,
	migrateCategoryValue,
} from "../utils/categoryUtils";
import { validateHabitForm } from "../utils/habitValidation";
// Note: wouldCreateCycle exists in tagUtils but isn't needed here because
// the children editor only allows selecting raw habits, not tags
import "./HabitSettings.css";

interface HabitSettingsProps {
	userId: string;
	onClose: () => void;
	onUpdate: () => void;
}

const TRACKING_TYPES = [
	{ value: "binary", label: "Binary", icon: "✓" },
	{ value: "sets", label: "Sets", icon: "123" },
	{ value: "hybrid", label: "Hybrid", icon: "✓/123" },
];

export const HabitSettings: React.FC<HabitSettingsProps> = ({
	userId,
	onClose,
	onUpdate,
}) => {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [changes, setChanges] = useState<Record<string, Partial<Habit>>>({});
	const [deletingHabits, setDeletingHabits] = useState<Set<string>>(new Set());
	const [showAddNew, setShowAddNew] = useState(false);
	const [newHabit, setNewHabit] = useState({
		name: "",
		category: "Mobility",
		trackingType: "hybrid" as "binary" | "sets" | "hybrid",
		targetPerWeek: 3,
		habitType: "raw" as HabitType,
		childIds: [] as string[],
	});
	// For editing tag children
	const [editingTagChildren, setEditingTagChildren] = useState<string | null>(
		null,
	);
	const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
		new Set(),
	);
	// Category filter
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	// Import/Export state
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importStatus, setImportStatus] = useState<string | null>(null);
	const [pendingImportData, setPendingImportData] = useState<ExportData | null>(
		null,
	);
	const [showImportConfirm, setShowImportConfirm] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const hasInitializedCollapse = useRef(false);

	const habitService = useHabitService();

	// Derive existing categories from habits
	const existingCategories = extractCategories(habits);

	// Group habits by category (exclude children - they show under their parent tag)
	const habitsByCategory = existingCategories.reduce(
		(acc, category) => {
			acc[category] = habits.filter(
				(h) =>
					h.category === category && (!h.parentIds || h.parentIds.length === 0),
			);
			return acc;
		},
		{} as Record<string, Habit[]>,
	);

	const loadHabits = useCallback(async () => {
		try {
			setIsLoading(true);
			setLoadError(null);
			const userHabits = await habitService.getHabits(userId);
			// Sort by category then by name
			userHabits.sort((a, b) => {
				if (a.category !== b.category) {
					return a.category.localeCompare(b.category);
				}
				return a.name.localeCompare(b.name);
			});
			setHabits(userHabits);
		} catch (err) {
			console.error("Error loading habits:", err);
			setLoadError("Failed to load habits. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, [userId, habitService]);

	useEffect(() => {
		loadHabits();
	}, [loadHabits]);

	// Start with all categories collapsed on initial load only
	useEffect(() => {
		if (habits.length > 0 && !hasInitializedCollapse.current) {
			hasInitializedCollapse.current = true;
			const allCategories = extractCategories(habits);
			setCollapsedCategories(new Set(allCategories));
		}
	}, [habits.length]);

	const handleFieldChange = (habitId: string, field: string, value: any) => {
		setChanges((prev) => ({
			...prev,
			[habitId]: {
				...prev[habitId],
				[field]: value,
			},
		}));
	};

	const getHabitValue = (habit: Habit, field: keyof Habit) => {
		if (changes[habit.id] && field in changes[habit.id]) {
			return changes[habit.id][
				field as keyof (typeof changes)[typeof habit.id]
			];
		}
		return habit[field];
	};

	const handleDeleteToggle = (habitId: string) => {
		setDeletingHabits((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(habitId)) {
				newSet.delete(habitId);
			} else {
				newSet.add(habitId);
			}
			return newSet;
		});
	};

	const handleAddNewHabit = async () => {
		const validation = validateHabitForm({
			name: newHabit.name,
			category: newHabit.category,
		});
		if (!validation.isValid) {
			alert(validation.errors.name || validation.errors.category);
			return;
		}

		try {
			const newHabitId = await habitService.createHabit({
				name: newHabit.name.trim(),
				category: newHabit.category.trim(),
				trackingType: newHabit.trackingType,
				targetPerWeek: newHabit.targetPerWeek,
				userId,
				habitType: newHabit.habitType,
				childIds: newHabit.habitType === "tag" ? newHabit.childIds : undefined,
			});

			// Update parentIds on children if this is a tag (parallel for atomicity)
			if (newHabit.habitType === "tag" && newHabit.childIds.length > 0) {
				const updatePromises = newHabit.childIds
					.map((childId) => {
						const child = habits.find((h) => h.id === childId);
						if (!child) return null;
						const newParentIds = [...(child.parentIds || []), newHabitId];
						return habitService.updateHabit(childId, {
							parentIds: newParentIds,
						});
					})
					.filter(Boolean);
				await Promise.all(updatePromises);
			}

			// Reset form and reload habits
			setNewHabit({
				name: "",
				category: "Mobility",
				trackingType: "hybrid",
				targetPerWeek: 3,
				habitType: "raw",
				childIds: [],
			});
			setShowAddNew(false);
			await loadHabits();
		} catch (err) {
			console.error("Error creating habit:", err);
			alert("Failed to create habit. Please try again.");
		}
	};

	const handleSaveAll = async () => {
		try {
			setSaveError(null);
			// Save changes
			for (const [habitId, habitChanges] of Object.entries(changes)) {
				if (Object.keys(habitChanges).length > 0) {
					await habitService.updateHabit(habitId, habitChanges);
				}
			}

			// Delete marked habits
			const habitsToDelete = Array.from(deletingHabits);
			for (const habitId of habitsToDelete) {
				// Delete all entries for this habit first
				const entries = await habitService.getEntriesForHabit(habitId);
				for (const entry of entries) {
					await habitService.deleteEntry(entry.id);
				}
				// Then delete the habit
				await habitService.deleteHabit(habitId);
			}

			onUpdate();
			onClose();
		} catch (err) {
			console.error("Error saving changes:", err);
			setSaveError("Failed to save changes. Please try again.");
		}
	};

	const hasChanges = Object.keys(changes).length > 0 || deletingHabits.size > 0;

	const toggleCategory = (category: string) => {
		setCollapsedCategories((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(category)) {
				newSet.delete(category);
			} else {
				newSet.add(category);
			}
			return newSet;
		});
	};

	// Import/Export handlers
	const handleExport = async () => {
		setIsExporting(true);
		setImportStatus(null);
		try {
			const data = await exportAllData();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = generateExportFilename();
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			setImportStatus(
				`Exported ${data.habits.length} habits and ${data.entries.length} entries`,
			);
		} catch (error) {
			console.error("Export failed:", error);
			setImportStatus("Export failed. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setImportStatus(null);
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);

			if (!validateExportData(parsed)) {
				throw new Error("Invalid backup file format");
			}

			setPendingImportData(parsed);
			setShowImportConfirm(true);
		} catch (error) {
			console.error("Import failed:", error);
			setImportStatus(
				error instanceof SyntaxError
					? "Invalid JSON file"
					: "Import failed. Please check the file format.",
			);
		} finally {
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleImportConfirm = async (mode: "merge" | "replace") => {
		if (!pendingImportData) return;

		setIsImporting(true);
		setShowImportConfirm(false);
		try {
			const result = await importAllData(pendingImportData, mode);
			const modeLabel =
				mode === "replace" ? "Replaced all data with" : "Merged";
			const affirmationPart =
				result.affirmationLogsImported > 0
					? `, ${result.affirmationLogsImported} affirmation logs`
					: "";
			setImportStatus(
				`${modeLabel} ${result.habitsImported} habits, ${result.entriesImported} entries${affirmationPart}`,
			);
			await loadHabits();
			onUpdate();
		} catch (error) {
			console.error("Import failed:", error);
			setImportStatus("Import failed. Please try again.");
		} finally {
			setIsImporting(false);
			setPendingImportData(null);
		}
	};

	const handleImportCancel = () => {
		setShowImportConfirm(false);
		setPendingImportData(null);
	};

	// Check if any habits need migration
	const habitsNeedingMigration = habits.filter(
		(h) => migrateCategoryValue(h.category) !== h.category,
	);
	const needsMigration = habitsNeedingMigration.length > 0;

	const [isMigrating, setIsMigrating] = useState(false);
	const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

	const handleMigrate = async () => {
		setIsMigrating(true);
		setMigrationStatus(null);
		try {
			let migratedCount = 0;
			for (const habit of habitsNeedingMigration) {
				const newCategory = migrateCategoryValue(habit.category);
				await habitService.updateHabit(habit.id, {
					category: newCategory,
				});
				migratedCount++;
			}
			setMigrationStatus(
				`Migrated ${migratedCount} habits to new category names`,
			);
			await loadHabits();
			onUpdate();
		} catch (error) {
			console.error("Migration failed:", error);
			setMigrationStatus("Migration failed. Please try again.");
		} finally {
			setIsMigrating(false);
		}
	};

	if (isLoading) {
		return (
			<div className="habit-settings-overlay">
				<div className="habit-settings-modal">
					<div className="modal-header">
						<h2>Manage Habits</h2>
						<button className="close-btn" onClick={onClose}>
							✕
						</button>
					</div>
					<div className="modal-body">
						<div className="loading">Loading habits...</div>
					</div>
				</div>
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="habit-settings-overlay">
				<div className="habit-settings-modal">
					<div className="modal-header">
						<h2>Manage Habits</h2>
						<button className="close-btn" onClick={onClose}>
							✕
						</button>
					</div>
					<div className="modal-body">
						<div className="error-state">
							<p>{loadError}</p>
							<button className="btn-retry" onClick={loadHabits}>
								Retry
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Helper to render a single habit row
	const renderHabitRow = (habit: Habit) => {
		const isTag = habit.habitType === "tag";
		const isEditingChildren = editingTagChildren === habit.id;
		const childCount = habit.childIds?.length || 0;

		return (
			<div
				key={habit.id}
				className={`habit-item ${deletingHabits.has(habit.id) ? "deleting" : ""} ${isTag ? "is-tag" : ""}`}
			>
				<div className="habit-row">
					<div className="habit-name-field">
						<input
							type="text"
							value={getHabitValue(habit, "name") as string}
							onChange={(e) =>
								handleFieldChange(habit.id, "name", e.target.value)
							}
							className="habit-name-input"
							placeholder="Habit name"
						/>
						{isTag && childCount > 0 && (
							<button
								className="edit-children-btn"
								onClick={() =>
									setEditingTagChildren(isEditingChildren ? null : habit.id)
								}
								title="Edit children"
							>
								({childCount}) {isEditingChildren ? "▲" : "▼"}
							</button>
						)}
						{isTag && childCount === 0 && (
							<button
								className="edit-children-btn empty"
								onClick={() =>
									setEditingTagChildren(isEditingChildren ? null : habit.id)
								}
								title="Add children"
							>
								+ Add children
							</button>
						)}
					</div>

					<div className="habit-category-field">
						<input
							type="text"
							list={`category-options-${habit.id}`}
							value={getHabitValue(habit, "category") as string}
							onChange={(e) =>
								handleFieldChange(habit.id, "category", e.target.value)
							}
							className="category-input"
							placeholder="Category"
							title="Category"
						/>
						<datalist id={`category-options-${habit.id}`}>
							{existingCategories.map((cat) => (
								<option key={cat} value={cat} />
							))}
						</datalist>
					</div>

					{/* Tags don't need tracking type - they aggregate from children */}
					{!isTag && (
						<div className="habit-type-field">
							<select
								value={
									(getHabitValue(habit, "trackingType") as string) || "hybrid"
								}
								onChange={(e) =>
									handleFieldChange(habit.id, "trackingType", e.target.value)
								}
								className="type-select"
								title="Tracking Type"
							>
								{TRACKING_TYPES.map((type) => (
									<option key={type.value} value={type.value}>
										{type.icon} {type.label}
									</option>
								))}
							</select>
						</div>
					)}

					<div className="habit-target-field">
						<input
							type="number"
							value={getHabitValue(habit, "targetPerWeek") as number}
							onChange={(e) =>
								handleFieldChange(
									habit.id,
									"targetPerWeek",
									Math.max(1, Math.min(7, parseInt(e.target.value) || 1)),
								)
							}
							className="target-input"
							min="1"
							max="7"
							title="Days per week"
						/>
						<span className="target-label">/wk</span>
					</div>

					<button
						className={`visibility-btn ${getHabitValue(habit, "hidden") ? "hidden" : ""}`}
						onClick={() =>
							handleFieldChange(
								habit.id,
								"hidden",
								!getHabitValue(habit, "hidden"),
							)
						}
						title={
							getHabitValue(habit, "hidden")
								? "Show in tracker"
								: "Hide from tracker"
						}
					>
						{getHabitValue(habit, "hidden") ? "👁️‍🗨️" : "👁️"}
					</button>

					<button
						className={`delete-btn ${deletingHabits.has(habit.id) ? "active" : ""}`}
						onClick={() => handleDeleteToggle(habit.id)}
						title={
							deletingHabits.has(habit.id)
								? "Click to cancel deletion"
								: "Mark for deletion"
						}
					>
						✕
					</button>
				</div>

				{/* Children editor for tags */}
				{isTag && isEditingChildren && (
					<div className="tag-children-editor">
						<div className="children-list">
							{habits
								.filter((h) => h.id !== habit.id && h.habitType !== "tag")
								.map((h) => {
									const currentChildIds =
										(getHabitValue(habit, "childIds") as string[]) || [];
									const isChild = currentChildIds.includes(h.id);
									// Get child's current parentIds (from pending changes or original)
									const childParentIds =
										(changes[h.id]?.parentIds as string[] | undefined) ??
										h.parentIds ??
										[];

									return (
										<label key={h.id} className="child-option">
											<input
												type="checkbox"
												checked={isChild}
												onChange={(e) => {
													const newChildIds = e.target.checked
														? [...currentChildIds, h.id]
														: currentChildIds.filter((id) => id !== h.id);
													handleFieldChange(habit.id, "childIds", newChildIds);

													// Keep parentIds in sync on the child habit
													const newParentIds = e.target.checked
														? [...childParentIds, habit.id]
														: childParentIds.filter((id) => id !== habit.id);
													handleFieldChange(h.id, "parentIds", newParentIds);
												}}
											/>
											{h.name}
										</label>
									);
								})}
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="habit-settings-overlay">
			{/* Import Confirm Dialog */}
			{showImportConfirm && pendingImportData && (
				<div className="import-confirm-overlay">
					<div className="import-confirm-dialog">
						<h3>Import Data</h3>
						<p>
							Found <strong>{pendingImportData.habits.length}</strong> habits
							and <strong>{pendingImportData.entries.length}</strong> entries
						</p>
						<p className="import-date">
							Backup from{" "}
							{new Date(pendingImportData.exportedAt).toLocaleDateString()}
						</p>
						<div className="import-confirm-buttons">
							<button
								className="btn-merge"
								onClick={() => handleImportConfirm("merge")}
							>
								Merge (keep existing)
							</button>
							<button
								className="btn-replace"
								onClick={() => handleImportConfirm("replace")}
							>
								Replace all
							</button>
							<button className="btn-cancel" onClick={handleImportCancel}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="habit-settings-modal">
				<div className="modal-header">
					<h2>Manage Habits</h2>
					<button className="close-btn" onClick={onClose}>
						✕
					</button>
				</div>

				<div className="modal-body">
					{/* Add New Habit Section */}
					<div className="add-new-section">
						{!showAddNew ? (
							<button
								className="add-new-btn"
								onClick={() => setShowAddNew(true)}
							>
								+ Add New Habit
							</button>
						) : (
							<div className="add-new-form">
								<div className="form-row">
									<div className="habit-type-toggle">
										<button
											className={`type-btn ${newHabit.habitType === "raw" ? "active" : ""}`}
											onClick={() =>
												setNewHabit({
													...newHabit,
													habitType: "raw",
													childIds: [],
												})
											}
										>
											Raw
										</button>
										<button
											className={`type-btn ${newHabit.habitType === "tag" ? "active" : ""}`}
											onClick={() =>
												setNewHabit({ ...newHabit, habitType: "tag" })
											}
										>
											Tag
										</button>
									</div>

									<input
										type="text"
										placeholder="Habit name"
										value={newHabit.name}
										onChange={(e) =>
											setNewHabit({ ...newHabit, name: e.target.value })
										}
										className="new-habit-input"
										autoFocus
									/>

									<input
										type="text"
										list="new-habit-category-options"
										placeholder="Category"
										value={newHabit.category}
										onChange={(e) =>
											setNewHabit({
												...newHabit,
												category: e.target.value,
											})
										}
										className="category-input"
									/>
									<datalist id="new-habit-category-options">
										{existingCategories.map((cat) => (
											<option key={cat} value={cat} />
										))}
									</datalist>

									{/* Tags don't need tracking type */}
									{newHabit.habitType !== "tag" && (
										<select
											value={newHabit.trackingType}
											onChange={(e) =>
												setNewHabit({
													...newHabit,
													trackingType: e.target.value as "binary" | "sets" | "hybrid",
												})
											}
											className="type-select"
											title="Tracking Type"
										>
											{TRACKING_TYPES.map((type) => (
												<option key={type.value} value={type.value}>
													{type.icon} {type.label}
												</option>
											))}
										</select>
									)}

									<div className="target-field">
										<input
											type="number"
											value={newHabit.targetPerWeek}
											onChange={(e) =>
												setNewHabit({
													...newHabit,
													targetPerWeek: Math.max(
														1,
														Math.min(7, parseInt(e.target.value) || 1),
													),
												})
											}
											className="target-input"
											min="1"
											max="7"
											title="Days per week"
										/>
										<span className="target-label">days/wk</span>
									</div>

									<button className="btn-add" onClick={handleAddNewHabit}>
										Add
									</button>

									<button
										className="btn-cancel-add"
										onClick={() => {
											setShowAddNew(false);
											setNewHabit({
												name: "",
												category: "Mobility",
												trackingType: "hybrid",
												targetPerWeek: 3,
												habitType: "raw",
												childIds: [],
											});
										}}
									>
										Cancel
									</button>
								</div>

								{/* Child selector for tags */}
								{newHabit.habitType === "tag" && (
									<div className="tag-children-selector">
										<span className="section-label">Include habits:</span>
										<div className="children-list">
											{habits
												.filter((h) => h.habitType !== "tag")
												.map((h) => (
													<label key={h.id} className="child-option">
														<input
															type="checkbox"
															checked={newHabit.childIds.includes(h.id)}
															onChange={(e) => {
																if (e.target.checked) {
																	setNewHabit({
																		...newHabit,
																		childIds: [...newHabit.childIds, h.id],
																	});
																} else {
																	setNewHabit({
																		...newHabit,
																		childIds: newHabit.childIds.filter(
																			(id) => id !== h.id,
																		),
																	});
																}
															}}
														/>
														{h.name}
													</label>
												))}
										</div>
										{newHabit.childIds.length > 0 && (
											<div className="selected-count">
												{newHabit.childIds.length} habit
												{newHabit.childIds.length !== 1 ? "s" : ""} selected
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>

					{/* Category filter */}
					<div className="category-filter">
						<label htmlFor="category-filter">Filter by category:</label>
						<select
							id="category-filter"
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
							className="category-filter-select"
						>
							<option value="all">All Categories</option>
							{existingCategories.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
						</select>
					</div>

					{/* Habits grouped by category */}
					<div className="habits-list">
						{existingCategories
							.filter(
								(category) =>
									categoryFilter === "all" || category === categoryFilter,
							)
							.map((category) => {
								const categoryInfo = buildCategoryInfo(category);
								const categoryHabits = habitsByCategory[category] || [];
								const isCollapsed = collapsedCategories.has(category);

								return (
									<div key={category} className="category-group">
										<button
											className="category-header"
											onClick={() => toggleCategory(category)}
										>
											<span
												className={`category-arrow ${isCollapsed ? "collapsed" : ""}`}
											>
												▼
											</span>
											<span
												className="category-dot"
												style={{ background: categoryInfo.color }}
											/>
											<span className="category-name">{category}</span>
											<span className="category-count">
												({categoryHabits.length})
											</span>
										</button>

										{!isCollapsed && (
											<div className="category-habits">
												{categoryHabits.map(renderHabitRow)}
											</div>
										)}
									</div>
								);
							})}
					</div>

					{habits.length === 0 && (
						<div className="empty-state">
							<p>No habits yet. Click "+ Add New Habit" to get started!</p>
						</div>
					)}

					{deletingHabits.size > 0 && (
						<div className="deletion-warning">
							{deletingHabits.size} habit{deletingHabits.size > 1 ? "s" : ""}{" "}
							marked for deletion. This will permanently delete all history.
						</div>
					)}

					{/* Migration Section - only show if needed */}
					{needsMigration && (
						<div className="migration-section">
							<div className="migration-info">
								<strong>{habitsNeedingMigration.length}</strong> habit
								{habitsNeedingMigration.length > 1 ? "s" : ""} use old category
								names
							</div>
							<button
								className="btn-migrate"
								onClick={handleMigrate}
								disabled={isMigrating}
							>
								{isMigrating ? "Migrating..." : "Migrate to New Names"}
							</button>
							{migrationStatus && (
								<div className="migration-status">{migrationStatus}</div>
							)}
						</div>
					)}

					{/* Import/Export Section */}
					<div className="import-export-section">
						<input
							type="file"
							ref={fileInputRef}
							accept=".json"
							onChange={handleFileChange}
							style={{ display: "none" }}
						/>
						<div className="import-export-buttons">
							<button
								className="btn-export"
								onClick={handleExport}
								disabled={isExporting}
							>
								{isExporting ? "Exporting..." : "↓ Export"}
							</button>
							<button
								className="btn-import"
								onClick={handleImportClick}
								disabled={isImporting}
							>
								{isImporting ? "Importing..." : "↑ Import"}
							</button>
						</div>
						{importStatus && (
							<div className="import-status">{importStatus}</div>
						)}
					</div>
				</div>

				{saveError && (
					<div className="save-error">
						{saveError}
					</div>
				)}

				<div className="modal-footer">
					<button className="btn-cancel" onClick={onClose}>
						Cancel
					</button>
					<button
						className="btn-save"
						onClick={handleSaveAll}
						disabled={!hasChanges}
					>
						{hasChanges
							? `Save Changes (${Object.keys(changes).length + deletingHabits.size})`
							: "No Changes"}
					</button>
				</div>
			</div>
		</div>
	);
};

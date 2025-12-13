import type { SyncState } from "dexie-cloud-addon";
import { useLiveQuery, useObservable } from "dexie-react-hooks";
import { useCallback, useState } from "react";
import { db, syncLogService } from "../config/db";
import type { SyncLog } from "../types/syncLog";
import { ChevronIcon, SyncIcon } from "./icons/MenuIcons";

interface DiagnosticResult {
	timestamp: Date;
	stalledJobs: number;
	internalTables: Array<{ name: string; count: number }>;
	persistedState: {
		initiallySynced: boolean;
		serverRevision: string | null;
		lastSyncTime: string | null;
	};
	currentSyncState: {
		phase: string;
		status: string;
		error: string | null;
		license: string | null;
	};
	authState: {
		isLoggedIn: boolean;
		userId: string | null;
		email: string | null;
		license: string | null;
	};
	environment: {
		online: boolean;
		serviceWorker: string;
		storageQuota: string | null;
		dexieCloudUrl: string | null;
		userAgent: string;
	};
	pendingMutations: {
		total: number;
		tables: Record<string, number>;
	};
	recommendations: string[];
}

type SyncStatePhase =
	| "initial"
	| "not-in-sync"
	| "pushing"
	| "pulling"
	| "in-sync"
	| "error"
	| "offline";

type WebSocketStatus =
	| "not-started"
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

interface PersistedSyncState {
	timestamp?: Date;
	serverRevision?: unknown;
	initiallySynced?: boolean;
}

function getSyncStatusLabel(
	syncState: SyncState | null,
	wsStatus: WebSocketStatus | null,
	isLocalMode: boolean,
): { label: string; status: "success" | "warning" | "error" | "neutral" } {
	if (isLocalMode) {
		return { label: "Local Only", status: "neutral" };
	}
	if (!syncState) {
		return { label: "Not configured", status: "neutral" };
	}

	const phase = syncState.phase as SyncStatePhase;
	if (phase === "error" || syncState.status === "error") {
		return { label: "Error", status: "error" };
	}
	if (phase === "offline" || syncState.status === "offline") {
		return { label: "Offline", status: "warning" };
	}
	if (syncState.status === "connecting" || phase === "initial") {
		return { label: "Connecting...", status: "warning" };
	}
	if (phase === "pushing") {
		return { label: "Uploading...", status: "warning" };
	}
	if (phase === "pulling") {
		return { label: "Downloading...", status: "warning" };
	}
	if (phase === "in-sync" && wsStatus === "connected") {
		return { label: "Synced (Live)", status: "success" };
	}
	if (phase === "in-sync") {
		return { label: "Synced", status: "success" };
	}

	return { label: syncState.phase as string, status: "neutral" };
}

function formatTimeAgo(date: Date | null | undefined): string {
	if (!date) return "Never";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	if (diffSecs < 10) return "Just now";
	if (diffSecs < 60) return `${diffSecs}s ago`;
	const diffMins = Math.floor(diffSecs / 60);
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	return date.toLocaleDateString();
}

function getPhaseLabel(phase: SyncStatePhase): string {
	switch (phase) {
		case "initial":
			return "Initializing";
		case "not-in-sync":
			return "Pending sync";
		case "pushing":
			return "Uploading";
		case "pulling":
			return "Downloading";
		case "in-sync":
			return "In sync";
		case "error":
			return "Error";
		case "offline":
			return "Offline";
		default:
			return phase;
	}
}

function getWsStatusLabel(status: WebSocketStatus | null): string {
	if (!status) return "Not started";
	switch (status) {
		case "not-started":
			return "Not started";
		case "connecting":
			return "Connecting...";
		case "connected":
			return "Connected";
		case "disconnected":
			return "Disconnected";
		case "error":
			return "Error";
		default:
			return status;
	}
}

function getLevelBadgeClass(level: SyncLog["level"]): string {
	switch (level) {
		case "success":
			return "sync-log-badge-success";
		case "error":
			return "sync-log-badge-error";
		case "warning":
			return "sync-log-badge-warning";
		default:
			return "sync-log-badge-info";
	}
}

function getEventTypeLabel(eventType: SyncLog["eventType"]): string {
	switch (eventType) {
		case "syncState":
			return "Sync";
		case "webSocket":
			return "WS";
		case "persistedState":
			return "Save";
		case "syncComplete":
			return "Done";
		case "staleAuth":
			return "Auth";
		default:
			return eventType;
	}
}

interface SyncSectionProps {
	isLocalMode: boolean;
}

export function SyncSection({ isLocalMode }: SyncSectionProps) {
	const [detailsExpanded, setDetailsExpanded] = useState(false);
	const [logsExpanded, setLogsExpanded] = useState(false);
	const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);
	const [diagnosticResult, setDiagnosticResult] =
		useState<DiagnosticResult | null>(null);
	const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
	const [isForcingSyncPull, setIsForcingSyncPull] = useState(false);
	const [isResettingSync, setIsResettingSync] = useState(false);
	const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);

	// Sync state observables
	const syncStateFromCloud = useObservable(() => db.cloud.syncState, []) as
		| SyncState
		| undefined;
	const wsStatusFromCloud = useObservable(() => db.cloud.webSocketStatus, []) as
		| WebSocketStatus
		| undefined;
	const persistedState = useObservable(
		() => db.cloud.persistedSyncState,
		[],
	) as PersistedSyncState | null;
	const currentUser = useObservable(() => db.cloud.currentUser, []) as
		| { userId?: string; email?: string; license?: { type?: string } }
		| undefined;

	// Logs
	const logs = useLiveQuery(() => syncLogService.getLogs(), []) ?? [];
	const recentLogs = logs.slice(0, 20); // Show only last 20 in the expando

	const syncState = isLocalMode ? null : (syncStateFromCloud ?? null);
	const wsStatus = isLocalMode ? null : (wsStatusFromCloud ?? null);
	const syncStatus = getSyncStatusLabel(syncState, wsStatus, isLocalMode);
	const phase = (syncState?.phase ?? "initial") as SyncStatePhase;
	const lastSynced = persistedState?.timestamp
		? new Date(persistedState.timestamp)
		: null;

	const handleSyncNow = async () => {
		try {
			await db.cloud.sync();
		} catch (err) {
			console.error("Manual sync failed:", err);
		}
	};

	const handleDownloadLogs = async () => {
		try {
			const logsJson = await syncLogService.exportLogs();
			const blob = new Blob([logsJson], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const a = document.createElement("a");
			a.href = url;
			a.download = `sync-logs-${timestamp}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to download logs:", err);
		}
	};

	const handleCopyLogs = async () => {
		try {
			const logsJson = await syncLogService.exportLogs();
			await navigator.clipboard.writeText(logsJson);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (err) {
			console.error("Failed to copy logs:", err);
		}
	};

	const handleClearLogs = async () => {
		if (confirm("Clear all debug logs?")) {
			try {
				await syncLogService.clearAll();
			} catch (err) {
				console.error("Failed to clear logs:", err);
			}
		}
	};

	const runDiagnostics = useCallback(async () => {
		setIsRunningDiagnostics(true);
		console.log("[Diagnostics] Starting diagnostics...");
		try {
			const recommendations: string[] = [];
			const internalTables: Array<{ name: string; count: number }> = [];

			// Get all table names from Dexie (user tables)
			const dexieTables = db.tables.map((t) => t.name);
			console.log("[Diagnostics] Dexie tables:", dexieTables);

			// Also get object stores directly from IndexedDB to find internal tables
			const idbDatabase = db.backendDB();
			const allStoreNames = idbDatabase
				? Array.from(idbDatabase.objectStoreNames)
				: [];
			console.log("[Diagnostics] All IndexedDB stores:", allStoreNames);

			// Find internal Dexie Cloud tables (start with $)
			const internalTableNames = allStoreNames.filter((name) =>
				name.startsWith("$"),
			);
			console.log("[Diagnostics] Internal tables:", internalTableNames);

			// Count entries in each internal table
			let stalledJobs = 0;
			for (const tableName of internalTableNames) {
				try {
					const table = db.table(tableName);
					const count = await table.count();
					internalTables.push({ name: tableName, count });
					console.log(`[Diagnostics] ${tableName}: ${count} entries`);

					// Check for stalled jobs
					if (tableName === "$jobs" && count > 0) {
						const jobs = await table.toArray();
						console.log("[Diagnostics] Jobs:", jobs);
						const now = Date.now();
						for (const job of jobs) {
							// Jobs older than 60 seconds are considered stalled
							const jobAge = job.startedAt
								? now - new Date(job.startedAt).getTime()
								: 0;
							if (jobAge > 60000) {
								stalledJobs++;
							}
						}
					}
				} catch (err) {
					console.warn(`[Diagnostics] Could not read table ${tableName}:`, err);
					internalTables.push({ name: tableName, count: -1 });
				}
			}

			// Add user tables for reference
			for (const tableName of dexieTables) {
				if (!tableName.startsWith("$")) {
					try {
						const table = db.table(tableName);
						const count = await table.count();
						internalTables.push({ name: tableName, count });
					} catch {
						internalTables.push({ name: tableName, count: -1 });
					}
				}
			}

			// Get persisted state info
			const persistedStateData = persistedState;
			const persistedStateInfo = {
				initiallySynced: persistedStateData?.initiallySynced ?? false,
				serverRevision: persistedStateData?.serverRevision
					? String(persistedStateData.serverRevision)
					: null,
				lastSyncTime: persistedStateData?.timestamp
					? new Date(persistedStateData.timestamp).toISOString()
					: null,
			};

			// Generate recommendations based on findings
			if (stalledJobs > 0) {
				recommendations.push(
					`Found ${stalledJobs} stalled job(s). Try "Force Pull Sync" or wait 60s for auto-recovery.`,
				);
			}

			if (phase === "initial" && syncState?.status === "connecting") {
				recommendations.push(
					"Stuck in 'initial/connecting' state. This may be a stalled job blocking sync.",
				);
				recommendations.push(
					"Try: 1) Wait 60 seconds, 2) Force Pull Sync, or 3) Reset Sync State",
				);
			}

			if (wsStatus === "disconnected" || wsStatus === "error") {
				recommendations.push(
					"WebSocket disconnected. Check network connectivity or Dexie Cloud service status.",
				);
			}

			if (!persistedStateInfo.initiallySynced) {
				recommendations.push(
					"Initial sync not completed. Data may not be fully synced from cloud.",
				);
			}

			const lastSyncTime = persistedStateInfo.lastSyncTime
				? new Date(persistedStateInfo.lastSyncTime)
				: null;
			if (lastSyncTime) {
				const hoursSinceSync =
					(Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
				if (hoursSinceSync > 1) {
					recommendations.push(
						`Last sync was ${hoursSinceSync.toFixed(1)} hours ago. Consider forcing a sync.`,
					);
				}
			}

			// Check auth state
			const authState = {
				isLoggedIn: !!currentUser?.userId,
				userId: currentUser?.userId ?? null,
				email: currentUser?.email ?? null,
				license: currentUser?.license?.type ?? null,
			};

			if (!authState.isLoggedIn) {
				recommendations.push(
					"Not logged in. Authentication may have expired. Try logging out and back in.",
				);
			}

			// Collect pending mutations
			const pendingMutations: {
				total: number;
				tables: Record<string, number>;
			} = { total: 0, tables: {} };
			for (const table of internalTables) {
				if (table.name.endsWith("_mutations") && table.count > 0) {
					pendingMutations.tables[table.name] = table.count;
					pendingMutations.total += table.count;
				}
			}

			if (pendingMutations.total > 0) {
				recommendations.push(
					`${pendingMutations.total} pending mutation(s) waiting to sync. Check network/auth.`,
				);
			}

			// Collect environment info
			let storageQuota: string | null = null;
			try {
				if (navigator.storage?.estimate) {
					const estimate = await navigator.storage.estimate();
					const usedMB = ((estimate.usage ?? 0) / 1024 / 1024).toFixed(1);
					const quotaMB = ((estimate.quota ?? 0) / 1024 / 1024).toFixed(0);
					storageQuota = `${usedMB}MB / ${quotaMB}MB`;
				}
			} catch {
				storageQuota = "Unable to check";
			}

			let serviceWorkerStatus = "Not supported";
			try {
				if ("serviceWorker" in navigator) {
					const registration = await navigator.serviceWorker.getRegistration();
					if (registration?.active) {
						serviceWorkerStatus = "Active";
					} else if (registration?.installing) {
						serviceWorkerStatus = "Installing";
					} else if (registration?.waiting) {
						serviceWorkerStatus = "Waiting";
					} else {
						serviceWorkerStatus = "Not registered";
					}
				}
			} catch {
				serviceWorkerStatus = "Error checking";
			}

			const environment = {
				online: navigator.onLine,
				serviceWorker: serviceWorkerStatus,
				storageQuota,
				dexieCloudUrl: import.meta.env.VITE_DEXIE_CLOUD_URL ?? null,
				userAgent: navigator.userAgent,
			};

			if (!navigator.onLine) {
				recommendations.push(
					"Browser reports offline. Check network connection.",
				);
			}

			if (recommendations.length === 0) {
				recommendations.push("No issues detected. Sync appears healthy.");
			}

			// Get current sync state with error
			const currentSyncState = {
				phase: phase as string,
				status: (syncState?.status as string) ?? "unknown",
				error: syncState?.error?.message ?? null,
				license: (syncState?.license as string) ?? null,
			};

			setDiagnosticResult({
				timestamp: new Date(),
				stalledJobs,
				internalTables,
				persistedState: persistedStateInfo,
				currentSyncState,
				authState,
				environment,
				pendingMutations,
				recommendations,
			});
		} catch (err) {
			console.error("Diagnostics failed:", err);
			setDiagnosticResult({
				timestamp: new Date(),
				stalledJobs: -1,
				internalTables: [],
				persistedState: {
					initiallySynced: false,
					serverRevision: null,
					lastSyncTime: null,
				},
				currentSyncState: {
					phase: "unknown",
					status: "unknown",
					error: err instanceof Error ? err.message : "Unknown error",
					license: null,
				},
				authState: {
					isLoggedIn: false,
					userId: null,
					email: null,
					license: null,
				},
				environment: {
					online: navigator.onLine,
					serviceWorker: "Unknown",
					storageQuota: null,
					dexieCloudUrl: import.meta.env.VITE_DEXIE_CLOUD_URL ?? null,
					userAgent: navigator.userAgent,
				},
				pendingMutations: { total: 0, tables: {} },
				recommendations: [
					`Diagnostics failed: ${err instanceof Error ? err.message : "Unknown error"}`,
				],
			});
		} finally {
			setIsRunningDiagnostics(false);
		}
	}, [
		persistedState,
		phase,
		syncState?.status,
		syncState?.error,
		syncState?.license,
		wsStatus,
		currentUser,
	]);

	const handleCopyDiagnostics = async () => {
		if (!diagnosticResult) return;
		try {
			const report = {
				timestamp: diagnosticResult.timestamp.toISOString(),
				currentSyncState: diagnosticResult.currentSyncState,
				wsStatus: wsStatus ?? "unknown",
				authState: diagnosticResult.authState,
				environment: diagnosticResult.environment,
				persistedState: diagnosticResult.persistedState,
				pendingMutations: diagnosticResult.pendingMutations,
				stalledJobs: diagnosticResult.stalledJobs,
				tables: Object.fromEntries(
					diagnosticResult.internalTables.map((t) => [t.name, t.count]),
				),
				recommendations: diagnosticResult.recommendations,
			};
			await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
			setDiagnosticsCopied(true);
			setTimeout(() => setDiagnosticsCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy diagnostics:", err);
		}
	};

	const handleForcePullSync = async () => {
		setIsForcingSyncPull(true);
		try {
			console.log("[Diagnostics] Forcing pull sync...");
			await db.cloud.sync({ wait: true, purpose: "pull" });
			console.log("[Diagnostics] Pull sync completed");
			// Re-run diagnostics to show updated state
			await runDiagnostics();
		} catch (err) {
			console.error("[Diagnostics] Force pull sync failed:", err);
			alert(
				`Force pull sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setIsForcingSyncPull(false);
		}
	};

	const handleResetSyncState = async () => {
		const confirmed = confirm(
			"WARNING: This will delete the local database and re-sync from cloud.\n\n" +
				"Any unsynced local changes will be LOST.\n\n" +
				"Are you sure you want to continue?",
		);

		if (!confirmed) return;

		setIsResettingSync(true);
		try {
			console.log("[Diagnostics] Resetting sync state...");

			// Delete the database
			await db.delete();
			console.log("[Diagnostics] Database deleted");

			// Reload the page to reinitialize
			alert(
				"Database reset complete. The page will now reload to re-sync from cloud.",
			);
			window.location.reload();
		} catch (err) {
			console.error("[Diagnostics] Reset sync state failed:", err);
			alert(
				`Reset failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
			setIsResettingSync(false);
		}
	};

	return (
		<div className="settings-section">
			<div className="settings-section-header">
				<div className="settings-section-icon">
					<SyncIcon />
				</div>
				<span className="settings-section-title">Cloud Sync</span>
			</div>
			<div className="settings-section-content">
				{/* Status row with Sync Now button */}
				<div className="sync-status-row">
					<div className="sync-status-left">
						<span className="settings-info-label">Status</span>
						<span
							className={`settings-status-badge settings-status-${syncStatus.status}`}
						>
							<span className="settings-status-dot" />
							{syncStatus.label}
						</span>
					</div>
					{!isLocalMode && (
						<button
							className="sync-now-button"
							onClick={handleSyncNow}
							title="Sync now"
						>
							Sync
						</button>
					)}
				</div>

				{/* Details expando */}
				<button
					className={`sync-expando-header ${detailsExpanded ? "expanded" : ""}`}
					onClick={() => setDetailsExpanded(!detailsExpanded)}
				>
					<ChevronIcon
						className={`sync-expando-chevron ${detailsExpanded ? "open" : ""}`}
					/>
					<span>Details</span>
				</button>
				{detailsExpanded && (
					<div className="sync-expando-content">
						<div className="sync-detail-row">
							<span>Phase</span>
							<span>{getPhaseLabel(phase)}</span>
						</div>
						<div className="sync-detail-row">
							<span>Last synced</span>
							<span>{formatTimeAgo(lastSynced)}</span>
						</div>
						<div className="sync-detail-row">
							<span>WebSocket</span>
							<span>{getWsStatusLabel(wsStatus)}</span>
						</div>
					</div>
				)}

				{/* Logs expando */}
				<button
					className={`sync-expando-header ${logsExpanded ? "expanded" : ""}`}
					onClick={() => setLogsExpanded(!logsExpanded)}
				>
					<ChevronIcon
						className={`sync-expando-chevron ${logsExpanded ? "open" : ""}`}
					/>
					<span>Logs ({logs.length})</span>
				</button>
				{logsExpanded && (
					<div className="sync-expando-content">
						{/* Log actions */}
						<div className="sync-log-actions">
							<button onClick={handleDownloadLogs} disabled={logs.length === 0}>
								Download
							</button>
							<button onClick={handleCopyLogs} disabled={logs.length === 0}>
								{copySuccess ? "Copied!" : "Copy"}
							</button>
							<button onClick={handleClearLogs} disabled={logs.length === 0}>
								Clear
							</button>
						</div>

						{/* Log entries */}
						{recentLogs.length === 0 ? (
							<div className="sync-log-empty">No sync events yet</div>
						) : (
							<div className="sync-log-list">
								{recentLogs.map((log) => (
									<div key={log.id} className="sync-log-entry">
										<div
											className="sync-log-entry-header"
											onClick={() =>
												setExpandedLogId(
													expandedLogId === log.id ? null : log.id,
												)
											}
										>
											<span
												className={`sync-log-badge ${getLevelBadgeClass(log.level)}`}
											>
												{getEventTypeLabel(log.eventType)}
											</span>
											<span className="sync-log-message">{log.message}</span>
											<span className="sync-log-time">
												{formatTimeAgo(log.timestamp)}
											</span>
										</div>
										{expandedLogId === log.id && log.data ? (
											<pre className="sync-log-details">
												{JSON.stringify(log.data, null, 2)}
											</pre>
										) : null}
									</div>
								))}
								{logs.length > 20 && (
									<div className="sync-log-more">
										+{logs.length - 20} more logs (download to see all)
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Diagnostics expando */}
				{!isLocalMode && (
					<>
						<button
							className={`sync-expando-header ${diagnosticsExpanded ? "expanded" : ""}`}
							onClick={() => setDiagnosticsExpanded(!diagnosticsExpanded)}
						>
							<ChevronIcon
								className={`sync-expando-chevron ${diagnosticsExpanded ? "open" : ""}`}
							/>
							<span>Diagnostics</span>
						</button>
						{diagnosticsExpanded && (
							<div className="sync-expando-content">
								{/* Diagnostic actions */}
								<div className="sync-log-actions">
									<button
										onClick={runDiagnostics}
										disabled={isRunningDiagnostics}
									>
										{isRunningDiagnostics ? "Running..." : "Run"}
									</button>
									<button
										onClick={handleCopyDiagnostics}
										disabled={!diagnosticResult}
									>
										{diagnosticsCopied ? "Copied!" : "Copy"}
									</button>
									<button
										onClick={handleForcePullSync}
										disabled={isForcingSyncPull}
									>
										{isForcingSyncPull ? "Syncing..." : "Force Pull"}
									</button>
								</div>

								{/* Diagnostic results */}
								{diagnosticResult && (
									<div className="sync-diagnostics-results">
										<div className="sync-diagnostics-section">
											<div className="sync-diagnostics-title">
												Recommendations
											</div>
											{diagnosticResult.recommendations.map((rec, i) => (
												<div key={i} className="sync-diagnostics-rec">
													{rec}
												</div>
											))}
										</div>

										<div className="sync-diagnostics-section">
											<div className="sync-diagnostics-title">Auth State</div>
											<div className="sync-detail-row">
												<span>Logged in</span>
												<span
													className={
														!diagnosticResult.authState.isLoggedIn
															? "sync-diagnostics-warning"
															: ""
													}
												>
													{diagnosticResult.authState.isLoggedIn ? "Yes" : "No"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Email</span>
												<span>
													{diagnosticResult.authState.email ?? "None"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>License</span>
												<span>
													{diagnosticResult.currentSyncState.license ?? "None"}
												</span>
											</div>
											{diagnosticResult.currentSyncState.error && (
												<div className="sync-detail-row">
													<span>Error</span>
													<span className="sync-diagnostics-warning">
														{diagnosticResult.currentSyncState.error}
													</span>
												</div>
											)}
										</div>

										<div className="sync-diagnostics-section">
											<div className="sync-diagnostics-title">Sync State</div>
											<div className="sync-detail-row">
												<span>Phase</span>
												<span>{diagnosticResult.currentSyncState.phase}</span>
											</div>
											<div className="sync-detail-row">
												<span>Status</span>
												<span>{diagnosticResult.currentSyncState.status}</span>
											</div>
											<div className="sync-detail-row">
												<span>Initially synced</span>
												<span>
													{diagnosticResult.persistedState.initiallySynced
														? "Yes"
														: "No"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Server revision</span>
												<span>
													{diagnosticResult.persistedState.serverRevision ??
														"None"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Last sync</span>
												<span>
													{diagnosticResult.persistedState.lastSyncTime
														? formatTimeAgo(
																new Date(
																	diagnosticResult.persistedState.lastSyncTime,
																),
															)
														: "Never"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Stalled jobs</span>
												<span
													className={
														diagnosticResult.stalledJobs > 0
															? "sync-diagnostics-warning"
															: ""
													}
												>
													{diagnosticResult.stalledJobs}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Pending mutations</span>
												<span
													className={
														diagnosticResult.pendingMutations.total > 0
															? "sync-diagnostics-warning"
															: ""
													}
												>
													{diagnosticResult.pendingMutations.total}
												</span>
											</div>
										</div>

										<div className="sync-diagnostics-section">
											<div className="sync-diagnostics-title">Environment</div>
											<div className="sync-detail-row">
												<span>Online</span>
												<span
													className={
														!diagnosticResult.environment.online
															? "sync-diagnostics-warning"
															: ""
													}
												>
													{diagnosticResult.environment.online ? "Yes" : "No"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Service Worker</span>
												<span>
													{diagnosticResult.environment.serviceWorker}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Storage</span>
												<span>
													{diagnosticResult.environment.storageQuota ?? "N/A"}
												</span>
											</div>
											<div className="sync-detail-row">
												<span>Cloud URL</span>
												<span className="sync-diagnostics-url">
													{diagnosticResult.environment.dexieCloudUrl ?? "N/A"}
												</span>
											</div>
										</div>

										{diagnosticResult.internalTables.length > 0 && (
											<div className="sync-diagnostics-section">
												<div className="sync-diagnostics-title">
													Internal Tables
												</div>
												{diagnosticResult.internalTables.map((table) => (
													<div key={table.name} className="sync-detail-row">
														<span>{table.name}</span>
														<span>
															{table.count >= 0 ? table.count : "Error"}
														</span>
													</div>
												))}
											</div>
										)}

										<div className="sync-diagnostics-timestamp">
											Ran at {diagnosticResult.timestamp.toLocaleTimeString()}
										</div>
									</div>
								)}

								{/* Nuclear option */}
								<div className="sync-diagnostics-danger">
									<button
										className="sync-diagnostics-reset-btn"
										onClick={handleResetSyncState}
										disabled={isResettingSync}
									>
										{isResettingSync
											? "Resetting..."
											: "Reset Sync State (Nuclear)"}
									</button>
									<div className="sync-diagnostics-danger-hint">
										Deletes local database and re-syncs from cloud. Use as last
										resort.
									</div>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

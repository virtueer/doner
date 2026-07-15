import {
	Box,
	Check,
	Copy,
	Database,
	ExternalLink,
	Folder,
	Info,
	Network,
	Play,
	Search,
	Terminal,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderAnsiLine } from "@/lib/ansi";
import { AttachTerminal } from "./AttachTerminal";
import { FileBrowser } from "./FileBrowser";

// --- Sub-component for Logs Streaming ---
function ContainerLogs({
	containerId,
	containerName,
}: {
	containerId: string;
	containerName: string;
}) {
	const [logs, setLogs] = useState<string[]>([]);
	const logsEndRef = useRef<HTMLDivElement>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);
		eventSourceRef.current = es;

		es.onmessage = (event) => {
			let line: string;
			try {
				const parsed = JSON.parse(event.data);
				line = typeof parsed === "string" ? parsed : String(parsed ?? "");
			} catch {
				line = event.data ?? "";
			}
			if (line) {
				setLogs((prev) => {
					const updated = [...prev, line];
					return updated.length > 500 ? updated.slice(-500) : updated;
				});
			}
		};

		es.onerror = () => {
			es.close();
		};

		return () => {
			es.close();
		};
	}, [containerId]);

	useEffect(() => {
		logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const openTerminalTab = () => {
		const url = `${window.location.origin}?logs=${encodeURIComponent(containerId)}&name=${encodeURIComponent(containerName)}`;
		window.open(url, "_blank");
	};

	return (
		<div className="flex flex-col h-full bg-[#0c0c0c] relative">
			<div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30">
				<div className="text-green-700 text-xs font-mono">
					$ docker logs -f {containerName}
				</div>
				<button
					onClick={openTerminalTab}
					className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
				>
					<ExternalLink className="h-3 w-3" />
					Open in new tab
				</button>
			</div>
			<div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
				{logs.length === 0 && (
					<div className="text-green-800 italic">Waiting for logs...</div>
				)}
				{logs.map((line, i) => (
					<div
						key={i}
						className="whitespace-pre-wrap break-all text-green-400/90"
					>
						{renderAnsiLine(line)}
					</div>
				))}
				<div ref={logsEndRef} />
			</div>
		</div>
	);
}

// FileBrowser moved to FileBrowser.tsx

// --- Main Unified Sheet ---
export function NodeDetailsSheet({
	nodeId,
	nodeName,
	nodeType,
	onClose,
}: {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	onClose: () => void;
}) {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"inspect" | "logs" | "attach" | "files"
	>("inspect");
	const [attachShell, setAttachShell] = useState("/bin/sh");
	const [attachMode, setAttachMode] = useState<"none" | "normal" | "sidecar">(
		"none",
	);
	const [stats, setStats] = useState<any>(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const [sheetWidth, setSheetWidth] = useState(() => window.innerWidth * 0.75);
	const isResizing = useRef(false);

	const handleMouseDown = useCallback((_: React.MouseEvent) => {
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
	}, []);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			// Sheet is on the right, so width is (window.innerWidth - mouseX)
			const newWidth = window.innerWidth - e.clientX;
			if (newWidth >= 400 && newWidth <= window.innerWidth * 0.95) {
				setSheetWidth(newWidth);
			}
		};
		const handleMouseUp = () => {
			if (isResizing.current) {
				isResizing.current = false;
				document.body.style.cursor = "default";
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "default";
		};
	}, []);

	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
		onCancel: () => void;
	} | null>(null);

	const [copiedJson, setCopiedJson] = useState(false);
	const handleCopyJson = () => {
		if (!data) return;
		const jsonStr = JSON.stringify(data, null, 2);

		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(jsonStr);
		} else {
			const textArea = document.createElement("textarea");
			textArea.value = jsonStr;
			textArea.style.position = "fixed";
			textArea.style.left = "-999999px";
			textArea.style.top = "-999999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			try {
				document.execCommand("copy");
			} catch (error) {
				console.error("Fallback copy failed", error);
			}
			textArea.remove();
		}

		setCopiedJson(true);
		setTimeout(() => setCopiedJson(false), 2000);
	};

	const handleClose = useCallback(() => {
		if (hasUnsavedChanges) {
			setConfirmDialog({
				isOpen: true,
				title: "Unsaved Changes",
				message: "You have unsaved changes. Are you sure you want to close?",
				onConfirm: () => {
					setConfirmDialog(null);
					onClose();
				},
				onCancel: () => {
					setConfirmDialog(null);
				},
			});
			return;
		}
		onClose();
	}, [hasUnsavedChanges, onClose]);

	const rawId = nodeId.replace(/^(cont-|net-|vol-|img-)/, "");
	const isContainer = nodeType === "containerNode";
	const isVolume = nodeType === "volumeNode";

	useEffect(() => {
		if (!isContainer) return;
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/container-stats/${rawId}`);

		es.onmessage = (event) => {
			try {
				const parsed = JSON.parse(event.data);
				if (!parsed.error) {
					setStats(parsed);
				}
			} catch (_e) {}
		};

		return () => {
			es.close();
		};
	}, [rawId, isContainer]);

	const [actionLoading, setActionLoading] = useState<
		"start" | "stop" | "restart" | null
	>(null);

	const handleAction = async (action: "start" | "stop" | "restart") => {
		try {
			setActionLoading(action);
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			await fetch(`${apiUrl}/api/containers/${rawId}/${action}`, {
				method: "POST",
			});
		} catch (err) {
			console.error(`Failed to ${action} container:`, err);
		} finally {
			setActionLoading(null);
		}
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
				const res = await fetch(`${apiUrl}/api/inspect/${nodeType}/${rawId}`);
				if (!res.ok) throw new Error("Failed to fetch inspect data");
				const json = await res.json();

				if (json.error) {
					throw new Error(json.error);
				}

				setData(json);
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [nodeType, rawId]);

	const rootKeys = data ? Object.keys(data) : [];

	const handleScrollTo = (key: string) => {
		const el = document.getElementById(`json-section-${key}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const formatBytes = (bytes: number, decimals = 2) => {
		if (!+bytes) return "0 Bytes";
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
	};

	const renderStatsInfo = () => {
		if (!stats) return null;

		let cpuPercent = 0.0;
		const cpuDelta =
			stats.cpu_stats?.cpu_usage?.total_usage -
			(stats.precpu_stats?.cpu_usage?.total_usage || 0);
		const systemDelta =
			stats.cpu_stats?.system_cpu_usage -
			(stats.precpu_stats?.system_cpu_usage || 0);

		if (systemDelta > 0.0 && cpuDelta > 0.0) {
			const cpus =
				stats.cpu_stats?.online_cpus ||
				stats.cpu_stats?.cpu_usage?.percpu_usage?.length ||
				1;
			cpuPercent = (cpuDelta / systemDelta) * cpus * 100.0;
		}

		const memUsage = stats.memory_stats?.usage || 0;
		const memLimit = stats.memory_stats?.limit || 0;
		const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100.0 : 0.0;

		return (
			<>
				<div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
					<div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
					<span className="font-semibold text-foreground/80">CPU:</span>
					<span className="font-mono text-blue-400">
						{cpuPercent.toFixed(2)}%
					</span>
				</div>
				<div
					className="flex items-center gap-1.5 cursor-help"
					title={`Usage: ${formatBytes(memUsage)} / Limit: ${formatBytes(memLimit)}`}
				>
					<div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
					<span className="font-semibold text-foreground/80">RAM:</span>
					<span className="font-mono text-purple-400">
						{memPercent.toFixed(2)}%
					</span>
				</div>
			</>
		);
	};

	// Helper to extract short info based on type
	const renderShortInfo = () => {
		if (!data) return null;
		if (isContainer) {
			return (
				<div className="flex flex-wrap items-center gap-4 text-xs mt-2 text-muted-foreground">
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">ID:</span>{" "}
						{data.Id?.substring(0, 12)}
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Image:</span>{" "}
						{data.Config?.Image}
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">State:</span>
						<span
							className={
								data.State?.Running ? "text-green-500" : "text-red-500"
							}
						>
							{data.State?.Status}
						</span>
					</div>
					{renderStatsInfo()}
				</div>
			);
		} else if (nodeType === "networkNode") {
			return (
				<div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">ID:</span>{" "}
						{data.Id?.substring(0, 12)}
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Driver:</span>{" "}
						{data.Driver}
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Scope:</span>{" "}
						{data.Scope}
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Subnet:</span>{" "}
						{data.IPAM?.Config?.[0]?.Subnet || "N/A"}
					</div>
				</div>
			);
		} else if (nodeType === "volumeNode") {
			return (
				<div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Driver:</span>{" "}
						{data.Driver}
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">
							Mountpoint:
						</span>{" "}
						<span className="truncate max-w-[200px]" title={data.Mountpoint}>
							{data.Mountpoint}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Created:</span>{" "}
						{new Date(data.CreatedAt).toLocaleString()}
					</div>
				</div>
			);
		}
		return null;
	};

	return (
		<>
			<div
				className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity"
				onClick={handleClose}
			/>
			<div
				className="fixed inset-y-0 right-0 z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
				style={{ width: sheetWidth }}
			>
				<div
					className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-primary/20 transition-colors z-50 group flex items-center justify-center"
					onMouseDown={handleMouseDown}
				>
					<div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
				</div>
				{/* Header Section */}
				<div className="px-6 py-4 border-b border-border bg-card/95 backdrop-blur z-10 shrink-0">
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
								{isContainer ? (
									<Box className="h-5 w-5 text-primary" />
								) : isVolume ? (
									<Database className="h-5 w-5 text-primary" />
								) : nodeType === "networkNode" ? (
									<Network className="h-5 w-5 text-primary" />
								) : (
									<Info className="h-5 w-5 text-primary" />
								)}
								{nodeName}
								<span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider ml-2 align-middle">
									{nodeType.replace("Node", "")}
								</span>
							</h2>
							{loading ? (
								<div className="h-4 w-64 bg-white/5 animate-pulse rounded mt-2" />
							) : (
								renderShortInfo()
							)}
						</div>
						<div className="flex items-center gap-2 mt-4 sm:mt-0">
							{isContainer && (
								<div className="flex items-center gap-2 mr-4 border-r border-border/20 pr-4">
									<button
										onClick={() => handleAction("start")}
										disabled={data?.State?.Running || actionLoading !== null}
										className="px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-16"
									>
										{actionLoading === "start" ? "..." : "Start"}
									</button>
									<button
										onClick={() => handleAction("stop")}
										disabled={!data?.State?.Running || actionLoading !== null}
										className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-16"
									>
										{actionLoading === "stop" ? "..." : "Stop"}
									</button>
									<button
										onClick={() => handleAction("restart")}
										disabled={actionLoading !== null}
										className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-20"
									>
										{actionLoading === "restart" ? "..." : "Restart"}
									</button>
								</div>
							)}
							<button
								onClick={handleClose}
								className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
					</div>

					{/* Tabs */}
					<div className="flex gap-4 mt-4 border-b border-white/5">
						<button
							onClick={() => setActiveTab("inspect")}
							className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
								activeTab === "inspect"
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground"
							}`}
						>
							<div className="flex items-center gap-1.5">
								<Search className="h-4 w-4" />
								Inspect
							</div>
						</button>
						{isContainer && (
							<>
								<button
									onClick={() => setActiveTab("logs")}
									className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
										activeTab === "logs"
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<div className="flex items-center gap-1.5">
										<Terminal className="h-4 w-4" />
										Logs
									</div>
								</button>
								<button
									onClick={() => setActiveTab("attach")}
									className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
										activeTab === "attach"
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<div className="flex items-center gap-1.5">
										<Play className="h-4 w-4" />
										Attach
									</div>
								</button>
							</>
						)}
						{(isVolume || isContainer) && (
							<button
								onClick={() => setActiveTab("files")}
								className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "files"
										? "border-primary text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground"
								}`}
							>
								<div className="flex items-center gap-1.5">
									<Folder className="h-4 w-4" />
									Files
								</div>
							</button>
						)}
					</div>
				</div>

				{/* Content Section */}
				<div className="flex-1 overflow-hidden flex flex-col relative bg-[#1e1e1e]">
					{activeTab === "inspect" &&
						(loading ? (
							<div className="flex-1 flex items-center justify-center">
								<span className="text-muted-foreground animate-pulse">
									Loading inspect data...
								</span>
							</div>
						) : error ? (
							<div className="flex-1 flex items-center justify-center text-destructive">
								{error}
							</div>
						) : (
							<>
								{/* Sticky Badges Header */}
								<div className="sticky top-0 z-20 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-white/10 p-3 shrink-0 flex flex-wrap gap-2 max-h-32 overflow-y-auto shadow-md">
									{rootKeys.map((key) => {
										let badgeColor =
											"bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10";
										if (key === "Mounts")
											badgeColor =
												"bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200";
										else if (key === "Config")
											badgeColor =
												"bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200";
										else if (key === "NetworkSettings")
											badgeColor =
												"bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200";

										return (
											<button
												key={key}
												onClick={() => handleScrollTo(key)}
												className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${badgeColor}`}
											>
												{key}
											</button>
										);
									})}
								</div>

								{/* JSON Content */}
								<div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
									<button
										onClick={handleCopyJson}
										className="absolute top-8 right-8 z-10 p-2 rounded-md bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
										title="Copy JSON"
									>
										{copiedJson ? (
											<Check className="h-4 w-4 text-green-500" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</button>
									<pre className="text-xs font-mono text-gray-300 overflow-x-auto bg-black/20 p-4 rounded-lg m-0 relative">
										{`{\n`}
										{rootKeys.map((key, index) => {
											const str = JSON.stringify({ [key]: data[key] }, null, 2);
											// Extract inner content without the outer braces
											const inner = str.substring(2, str.length - 2);
											return (
												<span
													key={key}
													id={`json-section-${key}`}
													className="scroll-mt-32 block"
												>
													{inner}
													{index < rootKeys.length - 1 ? "," : ""}
												</span>
											);
										})}
										{`}`}
									</pre>
								</div>
							</>
						))}

					{activeTab === "logs" && isContainer && (
						<ContainerLogs containerId={rawId} containerName={nodeName} />
					)}

					{activeTab === "attach" && isContainer && (
						<div className="flex flex-col h-full bg-[#0c0c0c] relative">
							<div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30">
								<div className="flex items-center gap-4">
									<select
										value={attachShell}
										onChange={(e) => setAttachShell(e.target.value)}
										disabled={attachMode !== "none"}
										className="bg-[#2a2a2a] text-xs text-white px-2 py-1 rounded border border-white/10 outline-none"
									>
										<option value="/bin/sh">/bin/sh</option>
										<option value="/bin/bash">/bin/bash</option>
									</select>
									{attachMode === "none" ? (
										<>
											<button
												onClick={() => setAttachMode("normal")}
												className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
											>
												Connect
											</button>
											<button
												onClick={() => setAttachMode("sidecar")}
												className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
											>
												Connect with Sidecar
											</button>
										</>
									) : (
										<button
											onClick={() => setAttachMode("none")}
											className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
										>
											Disconnect
										</button>
									)}
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => {
											const sidecarParam =
												attachMode === "sidecar" ? "&sidecar=true" : "";
											const url = `${window.location.origin}?attach=${encodeURIComponent(rawId)}&shell=${encodeURIComponent(attachShell)}&name=${encodeURIComponent(nodeName)}${sidecarParam}`;
											window.open(url, "_blank");
										}}
										className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
									>
										<ExternalLink className="h-3 w-3" />
										Open in new tab
									</button>
								</div>
							</div>
							<div className="flex-1 min-h-0 overflow-hidden">
								{attachMode !== "none" ? (
									<AttachTerminal
										containerId={rawId}
										shell={attachShell}
										isSidecar={attachMode === "sidecar"}
									/>
								) : (
									<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
										Select a shell and click Connect to start an interactive
										session.
									</div>
								)}
							</div>
						</div>
					)}

					{activeTab === "files" && isVolume && (
						<FileBrowser
							apiPrefix={`/api/volumes/${encodeURIComponent(data?.Name || rawId)}`}
							nodeName={data?.Name || rawId}
							type="volume"
							mounts={[]}
							onUnsavedChangesChange={setHasUnsavedChanges}
						/>
					)}

					{activeTab === "files" && isContainer && (
						<FileBrowser
							apiPrefix={`/api/containers/${encodeURIComponent(rawId)}`}
							nodeName={data?.Name?.replace(/^\//, "") || rawId}
							type="container"
							mounts={data?.Mounts || []}
							onUnsavedChangesChange={setHasUnsavedChanges}
						/>
					)}
				</div>
			</div>

			{/* Confirm Dialog Modal */}
			{confirmDialog?.isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
					<div
						className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
							<h3 className="text-base font-medium text-white/90">
								{confirmDialog.title}
							</h3>
							<button
								onClick={confirmDialog.onCancel}
								className="text-white/40 hover:text-white/80 transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="px-5 py-5">
							<p className="text-sm text-white/70 mb-4">
								{confirmDialog.message}
							</p>
						</div>
						<div className="px-5 py-4 bg-[#151515] flex items-center justify-end gap-3 border-t border-white/10">
							<button
								onClick={confirmDialog.onCancel}
								className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/5 rounded-md transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={confirmDialog.onConfirm}
								className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

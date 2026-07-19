import {
	Box,
	Check,
	Copy,
	Database,
	ExternalLink,
	Folder,
	Info,
	Link,
	Network,
	Play,
	Plus,
	Search,
	Terminal,
	Trash2,
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
	const [showTimestamps, setShowTimestamps] = useState(true);
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
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowTimestamps(!showTimestamps)}
						className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-green-800 text-green-600 hover:text-green-500 hover:bg-white/5 transition-colors"
					>
						{showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
					</button>
					<button
						onClick={openTerminalTab}
						className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
					>
						<ExternalLink className="h-3 w-3" />
						Open in new tab
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
				{logs.length === 0 && (
					<div className="text-green-800 italic">Waiting for logs...</div>
				)}
				{logs.map((line, i) => {
					const spaceIdx = line.indexOf(" ");
					let timestamp = "";
					let content = line;
					if (spaceIdx > 10 && spaceIdx <= 35) {
						const possibleTs = line.substring(0, spaceIdx);
						if (/^\d{4}-\d{2}-\d{2}T/.test(possibleTs)) {
							timestamp = possibleTs;
							content = line.substring(spaceIdx + 1);
						}
					}
					return (
						<div
							key={i}
							className="whitespace-pre-wrap break-all text-green-400/90 flex gap-3"
						>
							{timestamp && showTimestamps && (
								<span className="shrink-0 text-green-700/80 select-none">
									{timestamp}
								</span>
							)}
							<span className="flex-1">{renderAnsiLine(content)}</span>
						</div>
					);
				})}
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
	onOpenNode,
	onAutoReopenRequest,
}: {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	onClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
	onAutoReopenRequest?: (id: string, name: string, type: string) => void;
}) {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"inspect" | "logs" | "attach" | "files" | "links"
	>("inspect");
	const [attachShell, setAttachShell] = useState("/bin/sh");
	const [attachMode, setAttachMode] = useState<"none" | "normal" | "sidecar">(
		"none",
	);
	const [stats, setStats] = useState<any>(null);
	const [systemDf, setSystemDf] = useState<any>(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const [sheetWidth, setSheetWidth] = useState(() => window.innerWidth * 0.75);
	const isResizing = useRef(false);

	const [links, setLinks] = useState<{ title: string; url: string }[]>([]);
	const [linksLoading, setLinksLoading] = useState(false);

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
		isDeleteStep2?: boolean;
		showForceOption?: boolean;
		onConfirm: (force?: boolean) => void;
		onCancel: () => void;
	} | null>(null);

	const [forceCheck, setForceCheck] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const handleDeleteClick = () => {
		const isContainerOrImage = isContainer || nodeType === "imageNode";
		setConfirmDialog({
			isOpen: true,
			title: `Delete ${nodeType.replace("Node", "")}`,
			message:
				"Are you sure you want to delete this resource? This is step 1 of 2.",
			onConfirm: () => {
				setForceCheck(false);
				setConfirmDialog({
					isOpen: true,
					title: "Final Warning",
					message:
						"Are you ABSOLUTELY sure? This action is permanent and cannot be undone.",
					isDeleteStep2: true,
					showForceOption: isContainerOrImage,
					onConfirm: async (force) => {
						try {
							setDeleteLoading(true);
							const apiUrl =
								import.meta.env.VITE_API_URL || "http://localhost:3000";
							const res = await fetch(
								`${apiUrl}/api/delete/${nodeType}/${encodeURIComponent(rawId)}${force ? "?force=true" : ""}`,
								{
									method: "DELETE",
								},
							);
							if (!res.ok) {
								const err = await res.json().catch(() => ({}));
								throw new Error(err.message || "Deletion failed");
							}
							setConfirmDialog(null);
							onClose();
						} catch (err: any) {
							console.error("Delete failed:", err);
							alert(`Delete failed: ${err.message}`);
							setConfirmDialog(null);
						} finally {
							setDeleteLoading(false);
						}
					},
					onCancel: () => setConfirmDialog(null),
				});
			},
			onCancel: () => setConfirmDialog(null),
		});
	};

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
			if (action === "restart" || action === "start") {
				if (onAutoReopenRequest) {
					onAutoReopenRequest(nodeId, nodeName, nodeType);
				}
				onClose();
			}
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

				if (nodeType === "containerNode" || nodeType === "volumeNode") {
					fetch(`${apiUrl}/api/system/df`)
						.then((dfRes) => {
							if (dfRes.ok) {
								return dfRes.json();
							}
							return null;
						})
						.then((dfJson) => {
							if (dfJson) setSystemDf(dfJson);
						})
						.catch(console.error);
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();

		if (isContainer) {
			setLinksLoading(true);
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			fetch(`${apiUrl}/api/containers/${rawId}/links`)
				.then((res) => res.json())
				.then((data) => setLinks(data || []))
				.catch(console.error)
				.finally(() => setLinksLoading(false));
		}
	}, [nodeType, rawId, isContainer]);

	const saveLinks = async (newLinks: { title: string; url: string }[]) => {
		try {
			setLinksLoading(true);
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const res = await fetch(`${apiUrl}/api/containers/${rawId}/links`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ links: newLinks }),
			});
			if (res.ok) {
				setLinks(newLinks);
			}
		} catch (err) {
			console.error("Failed to save links:", err);
		} finally {
			setLinksLoading(false);
		}
	};

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
		if (!stats) {
			return (
				<div className="flex items-center gap-4 border-l border-white/10 pl-4 min-h-[24px]">
					<span className="text-xs text-muted-foreground animate-pulse">
						Loading stats...
					</span>
				</div>
			);
		}

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

		let ioRead = 0;
		let ioWrite = 0;
		if (stats.blkio_stats?.io_service_bytes_recursive) {
			for (const stat of stats.blkio_stats.io_service_bytes_recursive) {
				if (stat.op?.toLowerCase() === "read") ioRead += stat.value;
				if (stat.op?.toLowerCase() === "write") ioWrite += stat.value;
			}
		}

		return (
			<div className="flex items-center gap-4 border-l border-white/10 pl-4 min-h-[24px]">
				<div className="flex items-center gap-1.5">
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
				<div
					className="flex items-center gap-1.5 cursor-help"
					title={`Read: ${formatBytes(ioRead)} / Write: ${formatBytes(ioWrite)}`}
				>
					<div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
					<span className="font-semibold text-foreground/80">Disk I/O:</span>
					<span className="font-mono text-yellow-400">
						{formatBytes(ioRead)} / {formatBytes(ioWrite)}
					</span>
				</div>
			</div>
		);
	};

	// Helper to extract short info based on type
	const renderShortInfo = () => {
		if (!data) return null;
		if (isContainer) {
			return (
				<div className="flex flex-col gap-2 mt-2 text-xs text-muted-foreground w-full">
					<div className="flex flex-wrap items-center gap-4">
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

					{systemDf && (
						<div className="flex flex-col gap-1 border-t border-white/5 pt-2">
							{(() => {
								const dfContainer = systemDf.Containers?.find(
									(c: any) => c.Id === data.Id,
								);
								const sizeRw = dfContainer?.SizeRw;
								const sizeRootFs = dfContainer?.SizeRootFs;

								const volumes =
									data.Mounts?.filter((m: any) => m.Type === "volume") || [];

								return (
									<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
										{sizeRootFs !== undefined && sizeRw !== undefined && (
											<div
												className="flex items-center gap-1.5"
												title="Underlying image size"
											>
												<span className="font-semibold text-foreground/80">
													Image:
												</span>
												<div
													onClick={() => {
														if (onOpenNode) {
															onClose();
															onOpenNode(
																`img-${data.Image}`,
																data.Config?.Image || "Image",
																"imageNode",
															);
														}
													}}
													className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
												>
													<span className="truncate max-w-[120px]">
														{data.Config?.Image || "Image"}
													</span>
													<span className="text-[10px] opacity-70">
														({formatBytes(sizeRootFs - sizeRw)})
													</span>
												</div>
											</div>
										)}
										{sizeRw !== undefined && (
											<div
												className="flex items-center gap-1"
												title="Container's writable layer size"
											>
												<span className="font-semibold text-foreground/80">
													Container Size:
												</span>
												<span className="text-purple-400">
													{formatBytes(sizeRw)}
												</span>
											</div>
										)}
										{volumes.length > 0 && (
											<div className="flex items-center gap-2">
												<span className="font-semibold text-foreground/80">
													Volumes:
												</span>
												<div className="flex flex-wrap gap-1.5">
													{volumes.map((m: any) => {
														const volDf = systemDf.Volumes?.find(
															(v: any) => v.Name === m.Name,
														);
														const size = volDf?.UsageData?.Size || 0;
														return (
															<div
																key={m.Name}
																onClick={() => {
																	if (onOpenNode) {
																		onClose();
																		onOpenNode(
																			`vol-${m.Name}`,
																			m.Name,
																			"volumeNode",
																		);
																	}
																}}
																className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
																title={m.Name}
															>
																<span className="truncate max-w-[100px]">
																	{m.Name}
																</span>
																<span className="text-[10px] opacity-70">
																	({formatBytes(size)})
																</span>
															</div>
														);
													})}
												</div>
											</div>
										)}
									</div>
								);
							})()}
						</div>
					)}
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
			const dfVol = systemDf?.Volumes?.find((v: any) => v.Name === data.Name);
			const volSize = dfVol?.UsageData?.Size;

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
					{volSize !== undefined && (
						<div className="flex items-center gap-1 border-l border-white/10 pl-4">
							<span className="font-semibold text-foreground/80">Size:</span>{" "}
							<span className="text-emerald-400 font-mono">
								{formatBytes(volSize)}
							</span>
						</div>
					)}
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
								onClick={handleDeleteClick}
								disabled={deleteLoading}
								className="p-2 ml-2 mr-2 rounded-md hover:bg-red-500/20 text-red-500/70 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Delete Resource"
							>
								{deleteLoading ? "..." : <Trash2 className="h-5 w-5" />}
							</button>
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
						{isContainer && (
							<button
								onClick={() => setActiveTab("links")}
								className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "links"
										? "border-primary text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground"
								}`}
							>
								<div className="flex items-center gap-1.5">
									<Link className="h-4 w-4" />
									Links
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

					{activeTab === "links" && isContainer && (
						<div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#1e1e1e]">
							<div className="max-w-2xl mx-auto space-y-6">
								<div>
									<h3 className="text-lg font-medium text-white mb-2">
										Container Links
									</h3>
									<p className="text-sm text-white/50 mb-4">
										Add quick access URLs or ports for this container.
									</p>
								</div>

								{linksLoading ? (
									<div className="text-white/50 text-sm animate-pulse">
										Loading links...
									</div>
								) : (
									<div className="space-y-4">
										{links.map((link, idx) => (
											<div
												key={idx}
												className="flex gap-3 items-start p-3 bg-white/5 border border-white/10 rounded-lg"
											>
												<div className="flex-1 space-y-2">
													<input
														type="text"
														value={link.title}
														onChange={(e) => {
															const newLinks = [...links];
															newLinks[idx].title = e.target.value;
															setLinks(newLinks);
														}}
														placeholder="Link Title (e.g. Web UI)"
														className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
													/>
													<input
														type="text"
														value={link.url}
														onChange={(e) => {
															const newLinks = [...links];
															newLinks[idx].url = e.target.value;
															setLinks(newLinks);
														}}
														placeholder="URL (e.g. http://localhost:8080)"
														className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary font-mono"
													/>
												</div>
												<div className="flex flex-col gap-2">
													<button
														onClick={() => {
															if (link.url) window.open(link.url, "_blank");
														}}
														className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded"
														title="Open Link"
													>
														<ExternalLink className="w-4 h-4" />
													</button>
													<button
														onClick={() => {
															const newLinks = links.filter(
																(_, i) => i !== idx,
															);
															setLinks(newLinks);
														}}
														className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded"
														title="Remove Link"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										))}
										<button
											onClick={() =>
												setLinks([...links, { title: "", url: "" }])
											}
											className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
										>
											<Plus className="w-4 h-4" />
											Add Link
										</button>

										<div className="pt-4 border-t border-white/10 flex justify-end">
											<button
												onClick={() => saveLinks(links)}
												className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
											>
												Save Links
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
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
							<h3
								className={`text-base font-medium ${confirmDialog.isDeleteStep2 ? "text-red-500" : "text-white/90"}`}
							>
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
							<p
								className={`text-sm ${confirmDialog.showForceOption ? "mb-4" : ""} ${confirmDialog.isDeleteStep2 ? "text-red-400 font-medium" : "text-white/70"}`}
							>
								{confirmDialog.message}
							</p>
							{confirmDialog.showForceOption && (
								<label className="flex items-center gap-2 mt-4 text-sm text-white/80 cursor-pointer w-fit">
									<input
										type="checkbox"
										checked={forceCheck}
										onChange={(e) => setForceCheck(e.target.checked)}
										className="rounded border-white/20 bg-black/20 text-red-500 focus:ring-red-500/50"
									/>
									Force delete (even if running/used)
								</label>
							)}
						</div>
						<div className="px-5 py-4 bg-[#151515] flex items-center justify-end gap-3 border-t border-white/10">
							<button
								onClick={confirmDialog.onCancel}
								className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/5 rounded-md transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => confirmDialog.onConfirm(forceCheck)}
								className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${confirmDialog.isDeleteStep2 ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
							>
								{confirmDialog.isDeleteStep2 ? "Yes, DELETE it" : "Confirm"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

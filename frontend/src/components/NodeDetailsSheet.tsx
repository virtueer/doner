import {
	Box,
	Database,
	Folder,
	Info,
	Link,
	Network,
	Play,
	Search,
	Terminal,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AttachTab } from "./AttachTab";
import { ContainerLogs } from "./ContainerLogs";
import { FileBrowser } from "./FileBrowser";
import { InspectTab } from "./InspectTab";
import { LinksTab } from "./LinksTab";

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
	const [stats, setStats] = useState<any>(null);
	const [systemDf, setSystemDf] = useState<any>(null);
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

		fetchData();
	}, [nodeType, rawId]);

	const formatBytes = (bytes: number, decimals = 2) => {
		if (!+bytes) return "0 Bytes";
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
	};

	const formatUptime = (startedAt: string) => {
		const start = new Date(startedAt).getTime();
		if (Number.isNaN(start)) return "Unknown";
		const now = Date.now();
		const diffMs = Math.max(0, now - start);
		const diffSec = Math.floor(diffMs / 1000);

		const m = Math.floor(diffSec / 60);
		const h = Math.floor(m / 60);
		const d = Math.floor(h / 24);

		if (d > 0) return `${d}d ${h % 24}h`;
		if (h > 0) return `${h}h ${m % 60}m`;
		if (m > 0) return `${m}m ${diffSec % 60}s`;
		return `${diffSec}s`;
	};

	const renderStatsInfo = () => {
		if (!stats) {
			return (
				<div className="flex items-center gap-4 border-l border-white/10 pl-4 min-w-[200px] min-h-[24px]">
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
						{data.State?.Running && data.State?.StartedAt && (
							<div className="flex items-center gap-1">
								<span className="font-semibold text-foreground/80">
									Uptime:
								</span>{" "}
								{formatUptime(data.State.StartedAt)}
							</div>
						)}
						{renderStatsInfo()}
					</div>

					{systemDf ? (
						<div className="flex flex-col gap-1 border-t border-white/5 pt-2 min-h-[42px]">
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
					) : (
						<div className="flex flex-col gap-1 border-t border-white/5 pt-2 min-h-[42px] justify-center">
							<span className="text-xs text-muted-foreground animate-pulse">
								Loading size data...
							</span>
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
					{volSize !== undefined ? (
						<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
							<span className="font-semibold text-foreground/80">Size:</span>{" "}
							<span className="text-emerald-400 font-mono">
								{formatBytes(volSize)}
							</span>
						</div>
					) : (
						<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
							<span className="text-xs text-muted-foreground animate-pulse">
								Loading size...
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
				<div className="px-6 py-4 pb-0 border-b border-border bg-card/95 backdrop-blur z-10 shrink-0">
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
								{isContainer ? (
									<Box
										className={`h-5 w-5 ${data?.State?.Running ? "text-green-500" : "text-primary"}`}
									/>
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
									<Button
										size="sm"
										variant="default"
										onClick={() => handleAction("start")}
										disabled={data?.State?.Running || actionLoading !== null}
										className="bg-green-600 text-white hover:bg-green-700 border border-black w-16"
									>
										{actionLoading === "start" ? "..." : "Start"}
									</Button>
									<Button
										size="sm"
										variant="default"
										onClick={() => handleAction("stop")}
										disabled={!data?.State?.Running || actionLoading !== null}
										className="bg-red-600 text-white hover:bg-red-700 border border-black w-16"
									>
										{actionLoading === "stop" ? "..." : "Stop"}
									</Button>
									<Button
										size="sm"
										variant="default"
										onClick={() => handleAction("restart")}
										disabled={actionLoading !== null}
										className="bg-blue-600 text-white hover:bg-blue-700 border border-black w-20"
									>
										{actionLoading === "restart" ? "..." : "Restart"}
									</Button>
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
					{activeTab === "inspect" && (
						<InspectTab data={data} loading={loading} error={error} />
					)}

					{activeTab === "logs" && isContainer && (
						<ContainerLogs containerId={rawId} containerName={nodeName} />
					)}

					{activeTab === "attach" && isContainer && (
						<AttachTab containerId={rawId} containerName={nodeName} />
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
						<LinksTab containerId={rawId} />
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

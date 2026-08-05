import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AttachTab } from "./AttachTab";
import { type ConfirmDialogState, ConfirmModal } from "./ConfirmModal";
import { ContainerLogs } from "./ContainerLogs";
import { FileBrowser } from "./FileBrowser";
import { InspectTab } from "./InspectTab";
import { LinksTab } from "./LinksTab";
import { NodeActionButtons } from "./NodeActionButtons";
import { NodeShortInfo } from "./NodeShortInfo";

// --- Main Unified Sheet ---
export function NodeDetailsSheet({
	nodeId,
	nodeType,
	nodeName,
	onClose,
	onAutoReopenRequest,
	onOpenNode,
}: {
	nodeId: string;
	nodeType: string;
	nodeName: string;
	onClose: () => void;
	onAutoReopenRequest?: (id: string, name: string, type: string) => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}) {
	const [activeTab, setActiveTab] = useState<
		"inspect" | "logs" | "attach" | "files" | "links"
	>("inspect");
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

	const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
		null,
	);

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
	}, [isContainer, rawId]);

	const {
		data,
		isLoading: dataLoading,
		error: dataError,
	} = useQuery({
		queryKey: ["inspect", nodeType, rawId],
		queryFn: async () => {
			const res = await api.get(`/api/inspect/${nodeType}/${rawId}`);
			if (res.data?.error) throw new Error(res.data.error);
			return res.data;
		},
	});

	const { data: systemDf } = useQuery({
		queryKey: ["system-df"],
		queryFn: async () => {
			const res = await api.get(`/api/system/df`);
			return res.data;
		},
		enabled: nodeType === "containerNode" || nodeType === "volumeNode",
	});

	const loading = dataLoading;
	const error = dataError ? dataError.message : null;

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
								<span className="truncate max-w-[400px]">{nodeName}</span>
								<span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70 ml-2">
									{nodeType.replace("Node", "")}
								</span>
							</h2>
							{loading ? (
								<div className="h-4 w-64 bg-white/5 animate-pulse rounded mt-2" />
							) : (
								<NodeShortInfo
									data={data}
									nodeType={nodeType}
									isContainer={isContainer}
									systemDf={systemDf}
									stats={stats}
									onOpenNode={onOpenNode}
									onClose={onClose}
								/>
							)}
						</div>

						<NodeActionButtons
							nodeType={nodeType}
							rawId={rawId}
							nodeId={nodeId}
							nodeName={nodeName}
							data={data}
							isContainer={isContainer}
							onClose={onClose}
							onAutoReopenRequest={onAutoReopenRequest}
							handleClose={handleClose}
							setConfirmDialog={setConfirmDialog}
						/>
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
										Terminal
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
									{hasUnsavedChanges && (
										<div className="w-2 h-2 rounded-full bg-blue-500 ml-1" />
									)}
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

			<ConfirmModal confirmDialog={confirmDialog} />
		</>
	);
}

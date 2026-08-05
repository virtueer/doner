import { useCallback, useState } from "react";
import { useNodeStats } from "@/hooks/useNodeStats";
import { useResizableSheet } from "@/hooks/useResizableSheet";
import { AttachTab } from "./AttachTab";
import { type ConfirmDialogState, ConfirmModal } from "./ConfirmModal";
import { ContainerLogs } from "./ContainerLogs";
import { FileBrowser } from "./FileBrowser";
import { InspectTab } from "./InspectTab";
import { LinksTab } from "./LinksTab";
import { NodeDetailsHeader } from "./NodeDetails/NodeDetailsHeader";
import { NodeDetailsTabs } from "./NodeDetails/NodeDetailsTabs";

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
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const { sheetWidth, handleMouseDown } = useResizableSheet(0.75, 400);

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

	const { stats, data, dataLoading, dataError, systemDf } = useNodeStats(
		nodeType,
		rawId,
		isContainer,
	);

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
					<NodeDetailsHeader
						nodeType={nodeType}
						nodeId={nodeId}
						nodeName={nodeName}
						rawId={rawId}
						isContainer={isContainer}
						isVolume={isVolume}
						loading={loading}
						data={data}
						systemDf={systemDf}
						stats={stats}
						onOpenNode={onOpenNode}
						onClose={onClose}
						onAutoReopenRequest={onAutoReopenRequest}
						handleClose={handleClose}
						setConfirmDialog={setConfirmDialog}
					/>
					<NodeDetailsTabs
						activeTab={activeTab}
						setActiveTab={setActiveTab}
						isContainer={isContainer}
						isVolume={isVolume}
						hasUnsavedChanges={hasUnsavedChanges}
					/>
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

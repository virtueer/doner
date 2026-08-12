import { useCallback, useState } from "react";
import { api } from "../lib/api";
import { AttachTab } from "./AttachTab";
import { ContainerLogs } from "./ContainerLogs";
import { FileBrowser } from "./FileBrowser";
import { InspectTab } from "./InspectTab";
import { LinksTab } from "./LinksTab";
import {
	type ConfirmDialogState,
	NodeActionDialogs,
} from "./node-details/NodeActionDialogs";
import { SheetHeader } from "./node-details/SheetHeader";
import { SheetTabBar, type TabType } from "./node-details/SheetTabBar";
import { useNodeDetailsData } from "./node-details/useNodeDetailsData";
import { useResizableSheet } from "./node-details/useResizableSheet";

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
	const { sheetWidth, handleMouseDown } = useResizableSheet();
	const {
		rawId,
		isContainer,
		isVolume,
		data,
		loading,
		error,
		stats,
		systemDf,
		actionLoading,
		handleAction,
	} = useNodeDetailsData(
		nodeId,
		nodeName,
		nodeType,
		onClose,
		onAutoReopenRequest,
	);

	const [activeTab, setActiveTab] = useState<TabType>("inspect");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [forceCheck, setForceCheck] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
		null,
	);

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
							await api.delete(
								`/api/delete/${nodeType}/${encodeURIComponent(rawId)}${force ? "?force=true" : ""}`,
							);
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

	return (
		<>
			<div
				className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity"
				onClick={handleClose}
			/>
			<div
				className="fixed inset-y-0 right-0 z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right will-change-transform"
				style={{ width: sheetWidth }}
			>
				<div
					className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-primary/20 transition-colors z-50 group flex items-center justify-center"
					onMouseDown={handleMouseDown}
				>
					<div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
				</div>

				<div className="px-6 py-4 pb-0 border-b border-border bg-card z-10 shrink-0">
					<SheetHeader
						nodeName={nodeName}
						nodeType={nodeType}
						isContainer={isContainer}
						isVolume={isVolume}
						data={data}
						loading={loading}
						stats={stats}
						systemDf={systemDf}
						actionLoading={actionLoading}
						deleteLoading={deleteLoading}
						handleAction={handleAction}
						handleDeleteClick={handleDeleteClick}
						handleClose={handleClose}
						onOpenNode={onOpenNode}
					/>

					<SheetTabBar
						activeTab={activeTab}
						setActiveTab={setActiveTab}
						isContainer={isContainer}
						isVolume={isVolume}
					/>
				</div>

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

			<NodeActionDialogs
				confirmDialog={confirmDialog}
				forceCheck={forceCheck}
				setForceCheck={setForceCheck}
			/>
		</>
	);
}

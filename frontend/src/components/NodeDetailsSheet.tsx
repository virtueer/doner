import { useCallback, useRef, useState } from "react";
import { AppDialog, type DialogState } from "@/components/common/AppDialog";
import { OpenInNewTab } from "@/components/common/OpenInNewTab";
import { ResizableSheet } from "@/components/common/ResizableSheet";
import { LogViewer } from "@/components/log-viewer/LogViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { AttachTab } from "./AttachTab";
import { FileBrowser } from "./FileBrowser";
import { InspectTab } from "./InspectTab";
import { LinksTab } from "./LinksTab";
import { SheetHeader } from "./node-details/SheetHeader";
import { SheetTabBar, type TabType } from "./node-details/SheetTabBar";
import { useNodeDetailsData } from "./node-details/useNodeDetailsData";

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
	const [forceDelete, setForceDelete] = useState(false);
	const forceDeleteRef = useRef(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [dialog, setDialog] = useState<DialogState | null>(null);

	const closeDialog = () => setDialog(null);
	const updateForceDelete = (value: boolean) => {
		forceDeleteRef.current = value;
		setForceDelete(value);
	};

	const handleDeleteClick = () => {
		setDialog({
			isOpen: true,
			kind: "confirm",
			title: `Delete ${nodeType.replace("Node", "")}`,
			message:
				"Are you sure you want to delete this resource? This is step 1 of 2.",
			onCancel: closeDialog,
			onConfirm: () => {
				updateForceDelete(false);
				setDialog({
					isOpen: true,
					kind: "confirm",
					destructive: true,
					title: "Final Warning",
					message:
						"Are you ABSOLUTELY sure? This action is permanent and cannot be undone.",
					confirmLabel: "Yes, DELETE it",
					onCancel: closeDialog,
					onConfirm: async () => {
						try {
							setDeleteLoading(true);
							await api.delete(
								`/api/delete/${nodeType}/${encodeURIComponent(rawId)}${
									forceDeleteRef.current ? "?force=true" : ""
								}`,
							);
							closeDialog();
							onClose();
						} catch (err: any) {
							toast(`Delete failed: ${err.message}`, "error");
							closeDialog();
						} finally {
							setDeleteLoading(false);
						}
					},
				});
			},
		});
	};

	const handleClose = useCallback(() => {
		if (!hasUnsavedChanges) return onClose();
		setDialog({
			isOpen: true,
			kind: "confirm",
			title: "Unsaved Changes",
			message: "You have unsaved changes. Are you sure you want to close?",
			onCancel: () => setDialog(null),
			onConfirm: () => {
				setDialog(null);
				onClose();
			},
		});
	}, [hasUnsavedChanges, onClose]);

	const volumeName = data?.Name || rawId;
	const showForceOption =
		dialog?.destructive && (isContainer || nodeType === "imageNode");

	return (
		<>
			<ResizableSheet onClose={handleClose} initial={0.75} min={400}>
				<div className="z-10 shrink-0 border-b border-border bg-card px-6 pt-4">
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

				<div className="relative flex flex-1 flex-col overflow-hidden bg-surface">
					{activeTab === "inspect" && (
						<InspectTab data={data} loading={loading} error={error} />
					)}

					{activeTab === "logs" && isContainer && (
						<LogViewer
							containerId={rawId}
							containerName={nodeName}
							maxLines={500}
							compact
							className="h-full"
							actions={
								<OpenInNewTab params={{ logs: rawId, name: nodeName }} />
							}
						/>
					)}

					{activeTab === "attach" && isContainer && (
						<AttachTab containerId={rawId} containerName={nodeName} />
					)}

					{activeTab === "files" && (isVolume || isContainer) && (
						<FileBrowser
							apiPrefix={
								isVolume
									? `/api/volumes/${encodeURIComponent(volumeName)}`
									: `/api/containers/${encodeURIComponent(rawId)}`
							}
							nodeName={
								isVolume ? volumeName : data?.Name?.replace(/^\//, "") || rawId
							}
							type={isVolume ? "volume" : "container"}
							mounts={isVolume ? [] : data?.Mounts || []}
							onUnsavedChangesChange={setHasUnsavedChanges}
						/>
					)}

					{activeTab === "links" && isContainer && (
						<LinksTab containerId={rawId} />
					)}
				</div>
			</ResizableSheet>

			<AppDialog dialog={dialog}>
				{showForceOption && (
					<label
						htmlFor="force-delete"
						className="flex w-fit cursor-pointer items-center gap-2 text-sm"
					>
						<Checkbox
							id="force-delete"
							checked={forceDelete}
							onCheckedChange={(checked) => updateForceDelete(checked === true)}
						/>
						Force delete (even if running/used)
					</label>
				)}
			</AppDialog>
		</>
	);
}

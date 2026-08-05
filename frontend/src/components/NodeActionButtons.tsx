import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NodeActionButtons({
	nodeType,
	rawId,
	nodeId,
	nodeName,
	data,
	isContainer,
	onClose,
	onAutoReopenRequest,
	handleClose,
	setConfirmDialog,
}: {
	nodeType: string;
	rawId: string;
	nodeId: string;
	nodeName: string;
	data: any;
	isContainer: boolean;
	onClose: () => void;
	onAutoReopenRequest?: (id: string, name: string, type: string) => void;
	handleClose: () => void;
	setConfirmDialog: (dialog: any) => void;
}) {
	const [actionLoading, setActionLoading] = useState<
		"start" | "stop" | "restart" | null
	>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

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

	const handleDeleteClick = () => {
		const isContainerOrImage = isContainer || nodeType === "imageNode";
		setConfirmDialog({
			isOpen: true,
			title: `Delete ${nodeType.replace("Node", "")}`,
			message:
				"Are you sure you want to delete this resource? This is step 1 of 2.",
			onConfirm: () => {
				setConfirmDialog({
					isOpen: true,
					title: "Final Warning",
					message:
						"Are you ABSOLUTELY sure? This action is permanent and cannot be undone.",
					isDeleteStep2: true,
					showForceOption: isContainerOrImage,
					onConfirm: async (force: boolean) => {
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

	return (
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
	);
}

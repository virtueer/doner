import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

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
	const queryClient = useQueryClient();

	const actionMutation = useMutation({
		mutationFn: async (action: "start" | "stop" | "restart") => {
			const res = await api.post(`/api/containers/${rawId}/${action}`);
			return { action, data: res.data };
		},
		onSuccess: ({ action }) => {
			// Optimistically update the graph to reflect the new state instantly
			queryClient.setQueryData(["network-graph"], (oldData: any) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					nodes: oldData.nodes.map((n: any) => {
						if (n.id === nodeId) {
							const isRunning = action === "start" || action === "restart";
							return {
								...n,
								data: {
									...n.data,
									state: isRunning ? "running" : "exited",
									State: {
										...(n.data.State || {}),
										Running: isRunning,
									},
								},
							};
						}
						return n;
					}),
				};
			});

			if (action === "restart" || action === "start") {
				if (onAutoReopenRequest) {
					onAutoReopenRequest(nodeId, nodeName, nodeType);
				}
			}
			onClose();

			// Still invalidate to ensure we eventually sync with the real state
			queryClient.invalidateQueries({ queryKey: ["network-graph"] });
		},
		onError: (err: any, action) => {
			console.error(`Failed to ${action} container:`, err);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async ({ force }: { force: boolean }) => {
			const res = await api.delete(
				`/api/delete/${nodeType}/${encodeURIComponent(rawId)}${force ? "?force=true" : ""}`,
			);
			return res.data;
		},
		onSuccess: () => {
			// Optimistically remove the node from the graph
			queryClient.setQueryData(["network-graph"], (oldData: any) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					nodes: oldData.nodes.filter((n: any) => n.id !== nodeId),
					edges: oldData.edges.filter(
						(e: any) => e.source !== nodeId && e.target !== nodeId,
					),
				};
			});

			setConfirmDialog(null);
			onClose();
			queryClient.invalidateQueries({ queryKey: ["network-graph"] });
		},
		onError: (err: any) => {
			console.error("Delete failed:", err);
			const message = err.response?.data?.message || err.message;
			alert(`Delete failed: ${message}`);
			setConfirmDialog(null);
		},
	});

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
						deleteMutation.mutate({ force });
					},
					onCancel: () => setConfirmDialog(null),
				});
			},
			onCancel: () => setConfirmDialog(null),
		});
	};

	const handleStopClick = () => {
		setConfirmDialog({
			isOpen: true,
			title: "Stop Container",
			message: "Are you sure you want to stop this container?",
			onConfirm: () => {
				setConfirmDialog(null);
				actionMutation.mutate("stop");
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
						onClick={() => actionMutation.mutate("start")}
						disabled={data?.State?.Running || actionMutation.isPending}
						className="px-3 py-1.5 h-auto text-xs font-semibold rounded-md border transition-all bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:shadow-none w-16"
					>
						{actionMutation.isPending && actionMutation.variables === "start"
							? "..."
							: "Start"}
					</Button>
					<Button
						size="sm"
						variant="default"
						onClick={handleStopClick}
						disabled={!data?.State?.Running || actionMutation.isPending}
						className="px-3 py-1.5 h-auto text-xs font-semibold rounded-md border transition-all bg-red-600 border-red-500 text-white hover:bg-red-500 hover:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 disabled:shadow-none w-16"
					>
						{actionMutation.isPending && actionMutation.variables === "stop"
							? "..."
							: "Stop"}
					</Button>
					<Button
						size="sm"
						variant="default"
						onClick={() => actionMutation.mutate("restart")}
						disabled={actionMutation.isPending}
						className="px-3 py-1.5 h-auto text-xs font-semibold rounded-md border transition-all bg-blue-600 border-blue-500 text-white hover:bg-blue-500 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:shadow-none w-20"
					>
						{actionMutation.isPending && actionMutation.variables === "restart"
							? "..."
							: "Restart"}
					</Button>
				</div>
			)}
			<button
				onClick={handleDeleteClick}
				disabled={deleteMutation.isPending}
				className="p-2 ml-2 mr-2 rounded-md hover:bg-red-500/20 text-red-500/70 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				title="Delete Resource"
			>
				{deleteMutation.isPending ? "..." : <Trash2 className="h-5 w-5" />}
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

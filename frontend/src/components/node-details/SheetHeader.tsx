import { Trash2, X } from "lucide-react";
import { memo } from "react";
import { nodeMeta } from "@/components/graph/nodeMeta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SheetShortInfo } from "./SheetShortInfo";

type ContainerAction = "start" | "stop" | "restart";

interface SheetHeaderProps {
	nodeName: string;
	nodeType: string;
	isContainer: boolean;
	isVolume: boolean;
	data: any;
	loading: boolean;
	stats: any;
	systemDf: any;
	actionLoading: ContainerAction | null;
	deleteLoading: boolean;
	handleAction: (action: ContainerAction) => void;
	handleDeleteClick: () => void;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}

export const SheetHeader = memo(function SheetHeader({
	nodeName,
	nodeType,
	isContainer,
	isVolume,
	data,
	loading,
	stats,
	systemDf,
	actionLoading,
	deleteLoading,
	handleAction,
	handleDeleteClick,
	handleClose,
	onOpenNode,
}: SheetHeaderProps) {
	const meta = nodeMeta(nodeType);
	const Icon = meta.icon;
	const running = Boolean(data?.State?.Running);
	const busy = actionLoading !== null;

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<h2 className="flex items-center gap-2 text-lg font-semibold">
					<Icon
						className={cn(
							"size-5 shrink-0",
							isContainer && !running ? "text-idle" : meta.text,
						)}
					/>
					<span className="truncate">{nodeName}</span>
					<Badge
						variant="outline"
						className="shrink-0 uppercase tracking-wider"
					>
						{meta.label}
					</Badge>
				</h2>

				{loading ? (
					<Skeleton className="mt-3 h-4 w-64" />
				) : (
					<SheetShortInfo
						nodeType={nodeType}
						isContainer={isContainer}
						isVolume={isVolume}
						data={data}
						stats={stats}
						systemDf={systemDf}
						handleClose={handleClose}
						onOpenNode={onOpenNode}
					/>
				)}
			</div>

			<div className="flex shrink-0 items-center gap-1">
				{isContainer && (
					<div className="mr-2 flex items-center gap-1.5 border-r border-border pr-3">
						<Button
							size="sm"
							onClick={() => handleAction("start")}
							disabled={running || busy}
							className="w-16 bg-success/15 text-success hover:bg-success/25"
						>
							{actionLoading === "start" ? "..." : "Start"}
						</Button>
						<Button
							size="sm"
							variant="destructive"
							onClick={() => handleAction("stop")}
							disabled={!running || busy}
							className="w-16"
						>
							{actionLoading === "stop" ? "..." : "Stop"}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleAction("restart")}
							disabled={busy}
							className="w-20"
						>
							{actionLoading === "restart" ? "..." : "Restart"}
						</Button>
					</div>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleDeleteClick}
					disabled={deleteLoading}
					title="Delete resource"
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 />
				</Button>
				<Button variant="ghost" size="icon-sm" onClick={handleClose}>
					<X />
				</Button>
			</div>
		</div>
	);
});

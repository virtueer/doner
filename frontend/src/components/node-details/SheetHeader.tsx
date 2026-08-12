import { Box, Database, Info, Network, Trash2, X } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { SheetShortInfo } from "./SheetShortInfo";

interface SheetHeaderProps {
	nodeName: string;
	nodeType: string;
	isContainer: boolean;
	isVolume: boolean;
	data: any;
	loading: boolean;
	stats: any;
	systemDf: any;
	actionLoading: "start" | "stop" | "restart" | null;
	deleteLoading: boolean;
	handleAction: (action: "start" | "stop" | "restart") => void;
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
	return (
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
					<SheetShortInfo
						nodeType={nodeType}
						isContainer={isContainer}
						data={data}
						stats={stats}
						systemDf={systemDf}
						handleClose={handleClose}
						onOpenNode={onOpenNode}
					/>
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
	);
});

import { Box, Database, Info, Network } from "lucide-react";
import { NodeActionButtons } from "../NodeActionButtons";
import { NodeShortInfo } from "../NodeShortInfo";

interface NodeDetailsHeaderProps {
	nodeType: string;
	nodeId: string;
	nodeName: string;
	rawId: string;
	isContainer: boolean;
	isVolume: boolean;
	loading: boolean;
	data: any;
	systemDf: any;
	stats: any;
	onOpenNode?: (id: string, name: string, type: string) => void;
	onClose: () => void;
	onAutoReopenRequest?: (id: string, name: string, type: string) => void;
	handleClose: () => void;
	setConfirmDialog: (dialog: any) => void;
}

export function NodeDetailsHeader({
	nodeType,
	nodeId,
	nodeName,
	rawId,
	isContainer,
	isVolume,
	loading,
	data,
	systemDf,
	stats,
	onOpenNode,
	onClose,
	onAutoReopenRequest,
	handleClose,
	setConfirmDialog,
}: NodeDetailsHeaderProps) {
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
	);
}

import { Position } from "@xyflow/react";
import { Network } from "lucide-react";
import { memo } from "react";
import { GraphNode, NodeBadge, NodeField, NodeHandle } from "./GraphNode";

export const NetworkNode = memo(function NetworkNode({ data }: { data: any }) {
	return (
		<GraphNode
			accent="network"
			icon={Network}
			title={data.label}
			titleMax="max-w-[160px]"
			className="w-[280px]"
			badge={<NodeBadge accent="network">{data.count || 0}</NodeBadge>}
			handles={
				<>
					<NodeHandle
						accent="network"
						type="target"
						position={Position.Right}
					/>
					<NodeHandle accent="network" type="source" position={Position.Left} />
				</>
			}
		>
			<div className="flex items-center gap-2">
				<NodeField accent="network">{data.driver}</NodeField>
				{data.scope && (
					<span className="text-[10px] text-muted-foreground">
						{data.scope}
					</span>
				)}
			</div>
		</GraphNode>
	);
});

import { Position } from "@xyflow/react";
import { HardDrive } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { GraphNode, NodeBadge, NodeField, NodeHandle } from "./GraphNode";

function truncateMiddle(value: string, max = 20) {
	if (value.length <= max) return value;
	return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

export const VolumeNode = memo(function VolumeNode({ data }: { data: any }) {
	const accent = data.isUsed === false ? "idle" : "volume";

	return (
		<GraphNode
			accent={accent}
			icon={HardDrive}
			title={truncateMiddle(data.label)}
			tooltip={data.label}
			titleMax="max-w-[140px]"
			className={cn("w-[260px]", accent === "idle" && "opacity-70")}
			badge={<NodeBadge accent={accent}>{data.driver || "local"}</NodeBadge>}
			handles={
				<>
					<NodeHandle accent={accent} type="target" position={Position.Left} />
					<NodeHandle accent={accent} type="source" position={Position.Right} />
				</>
			}
		>
			{data.mountpoint && (
				<NodeField accent={accent} title={data.mountpoint}>
					{data.mountpoint}
				</NodeField>
			)}
		</GraphNode>
	);
});

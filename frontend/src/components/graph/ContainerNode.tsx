import { Position } from "@xyflow/react";
import { Box } from "lucide-react";
import { memo } from "react";
import { GraphNode, NodeField, NodeHandle, NodeStatus } from "./GraphNode";

export const ContainerNode = memo(function ContainerNode({
	data,
}: {
	data: any;
}) {
	const accent =
		data.isInternal === true
			? "internal"
			: data.state === "running"
				? "container"
				: "idle";

	return (
		<GraphNode
			accent={accent}
			icon={Box}
			title={data.label}
			titleMax="max-w-[190px]"
			className="w-[310px] cursor-pointer"
			badge={<NodeStatus accent={accent} label={data.state} />}
			handles={
				<>
					<NodeHandle
						accent="network"
						type="target"
						position={Position.Left}
						id="net-in"
						style={{ top: "40%" }}
					/>
					<NodeHandle
						accent="network"
						type="source"
						position={Position.Left}
						id="net-out"
						style={{ top: "60%" }}
					/>
					<NodeHandle
						accent="volume"
						type="source"
						position={Position.Right}
						id="vol-out"
						style={{ top: "40%" }}
					/>
					<NodeHandle
						accent="volume"
						type="target"
						position={Position.Right}
						id="vol-in"
						style={{ top: "60%" }}
					/>
				</>
			}
		>
			<NodeField accent={accent} title={data.image}>
				{data.image}
			</NodeField>
		</GraphNode>
	);
});

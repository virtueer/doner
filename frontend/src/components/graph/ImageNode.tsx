import { Layers } from "lucide-react";
import { memo } from "react";
import { formatBytes } from "@/lib/format";
import { GraphNode } from "./GraphNode";

export const ImageNode = memo(function ImageNode({ data }: { data: any }) {
	const accent = data.isUsed === false ? "idle" : "image";
	const created = new Date(data.created * 1000);

	return (
		<GraphNode
			accent={accent}
			icon={Layers}
			title={data.label}
			titleMax="max-w-[170px]"
			className="w-[250px] cursor-pointer"
		>
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
				<dt className="text-muted-foreground">Size</dt>
				<dd className="text-right font-mono">{formatBytes(data.size)}</dd>
				<dt className="text-muted-foreground">Created</dt>
				<dd
					className="truncate text-right font-mono"
					title={created.toLocaleString()}
				>
					{created.toLocaleDateString()}
				</dd>
			</dl>
		</GraphNode>
	);
});

import { Handle, Position } from "@xyflow/react";
import { Layers } from "lucide-react";

export function ImageNode({ data }: { data: any }) {
	const formatSize = (bytes: number) => {
		if (!bytes) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const isUsed = data.isUsed !== false; // Default to true if missing

	return (
		<div
			className="w-[250px] rounded-xl border backdrop-blur-md shadow-lg p-0 overflow-visible relative cursor-pointer transition-all hover:shadow-xl group"
			style={{
				borderColor: isUsed
					? "rgba(236, 72, 153, 0.35)"
					: "rgba(100, 116, 139, 0.35)",
				backgroundColor: isUsed
					? "rgba(80, 7, 36, 0.5)"
					: "rgba(30, 41, 59, 0.6)",
				boxShadow: isUsed
					? "0 4px 20px rgba(236, 72, 153, 0.08)"
					: "0 4px 20px rgba(100, 116, 139, 0.08)",
			}}
		>
			<Handle
				type="source"
				position={Position.Right}
				id="img-out"
				style={{ display: "none" }}
			/>
			<div className="flex flex-col">
				{/* Header */}
				<div
					className="flex items-center gap-3 p-3 border-b cursor-grab active:cursor-grabbing rounded-t-xl"
					style={{
						backgroundColor: isUsed
							? "rgba(236, 72, 153, 0.12)"
							: "rgba(100, 116, 139, 0.1)",
						borderColor: isUsed
							? "rgba(236, 72, 153, 0.15)"
							: "rgba(100, 116, 139, 0.15)",
					}}
				>
					<div
						className="p-2 rounded-lg group-hover:scale-110 transition-all duration-300"
						style={{
							backgroundColor: isUsed
								? "rgba(236, 72, 153, 0.2)"
								: "rgba(100, 116, 139, 0.2)",
						}}
					>
						<Layers
							className="w-4 h-4"
							style={{ color: isUsed ? "#f472b6" : "#94a3b8" }}
						/>
					</div>
					<div className="flex flex-col flex-1 min-w-0">
						<div
							className="text-sm font-semibold text-white break-words whitespace-normal leading-tight"
							title={data.label}
						>
							{data.label}
						</div>
						<div
							className="text-[10px] font-medium uppercase tracking-wider mt-1"
							style={{
								color: isUsed
									? "rgba(244, 114, 182, 0.6)"
									: "rgba(148, 163, 184, 0.6)",
							}}
						>
							Docker Image
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="p-3">
					<div className="flex flex-col gap-2">
						<div className="flex justify-between items-center text-xs">
							<span
								style={{
									color: isUsed
										? "rgba(244, 114, 182, 0.6)"
										: "rgba(148, 163, 184, 0.6)",
								}}
							>
								Size:
							</span>
							<span className="font-mono text-white/90">
								{formatSize(data.size)}
							</span>
						</div>
						<div className="flex justify-between items-center text-xs">
							<span
								style={{
									color: isUsed
										? "rgba(244, 114, 182, 0.6)"
										: "rgba(148, 163, 184, 0.6)",
								}}
							>
								Created:
							</span>
							<span
								className="font-mono text-white/90 truncate pl-2"
								title={new Date(data.created * 1000).toLocaleString()}
							>
								{new Date(data.created * 1000).toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

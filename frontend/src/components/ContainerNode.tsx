import { Handle, Position } from "@xyflow/react";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContainerNode({ data }: { data: any }) {
	const isRunning = data.state === "running";
	const isInternal = data.isInternal === true;

	return (
		<div
			className={cn(
				"w-[310px] rounded-xl border backdrop-blur-md shadow-lg p-0 overflow-visible relative cursor-pointer transition-all hover:shadow-xl",
				isInternal
					? "border-purple-500/35 bg-purple-950/40 shadow-[0_4px_20px_rgba(168,85,247,0.08)]"
					: isRunning
						? "border-green-500/35 bg-green-950/40 shadow-[0_4px_20px_rgba(34,197,94,0.08)]"
						: "border-slate-400/35 bg-slate-800/40 shadow-[0_4px_20px_rgba(156,163,175,0.08)]",
			)}
		>
			<Handle
				type="target"
				position={Position.Left}
				id="net-in"
				className="!w-3 !h-3 !bg-indigo-400 !-left-1.5 top-[40%]"
			/>
			<Handle
				type="source"
				position={Position.Left}
				id="net-out"
				className="!w-3 !h-3 !bg-indigo-400 !-left-1.5 top-[60%]"
			/>
			<Handle
				type="source"
				position={Position.Right}
				id="vol-out"
				className="!w-3 !h-3 !bg-amber-400 !-right-1.5 top-[40%]"
			/>
			<Handle
				type="target"
				position={Position.Right}
				id="vol-in"
				className="!w-3 !h-3 !bg-amber-400 !-right-1.5 top-[60%]"
			/>
			<div
				className={cn(
					"drag-handle flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing rounded-t-xl",
					isInternal
						? "bg-purple-500/10 border-purple-500/15"
						: isRunning
							? "bg-green-500/10 border-green-500/15"
							: "bg-slate-400/10 border-slate-400/15",
				)}
			>
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"p-1.5 rounded-md",
							isInternal
								? "bg-purple-500/20"
								: isRunning
									? "bg-green-500/20"
									: "bg-slate-400/20",
						)}
					>
						<Box
							className={cn(
								"h-4 w-4",
								isInternal
									? "text-purple-400"
									: isRunning
										? "text-green-400"
										: "text-slate-400",
							)}
						/>
					</div>
					<span
						className="text-sm font-bold text-white truncate max-w-[190px]"
						title={data.label}
					>
						{data.label}
					</span>
				</div>
				<span
					className={cn(
						"px-2 py-0.5 text-[10px] rounded-full font-mono font-semibold uppercase tracking-wider",
						isInternal
							? "bg-purple-500/20 text-purple-300"
							: isRunning
								? "bg-green-500/20 text-green-300"
								: "bg-slate-500/20 text-slate-400",
					)}
				>
					{isInternal ? "Internal" : data.state}
				</span>
			</div>

			<div className="p-4 space-y-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-white/40 font-medium">Image</span>
					<span
						className="text-white/80 font-mono truncate max-w-[190px]"
						title={data.image}
					>
						{data.image}
					</span>
				</div>

				{data.mounts && data.mounts.length > 0 && (
					<div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
						<span className="text-white/40 font-medium">Mounts</span>
						<div className="flex items-center gap-1">
							<span className="text-amber-400 font-mono font-semibold">
								{data.mounts.length}
							</span>
							<span className="text-white/60">
								{data.mounts.length === 1 ? "volume" : "volumes"}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

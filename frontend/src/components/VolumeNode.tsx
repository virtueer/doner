import { Handle, Position } from "@xyflow/react";
import { HardDrive } from "lucide-react";

export function VolumeNode({ data }: { data: any }) {
	const displayName =
		data.label.length > 20
			? data.label.substring(0, 8) +
				"..." +
				data.label.substring(data.label.length - 8)
			: data.label;

	const isUnused = data.isUsed === false;

	const containerClasses = isUnused
		? "w-[260px] rounded-xl border border-slate-500/40 bg-slate-950/50 backdrop-blur-md shadow-lg shadow-slate-500/10 p-0 overflow-visible relative opacity-70"
		: "w-[260px] rounded-xl border border-amber-500/40 bg-amber-950/50 backdrop-blur-md shadow-lg shadow-amber-500/10 p-0 overflow-visible relative";

	const handleClasses = isUnused
		? "!w-3 !h-3 !bg-slate-400"
		: "!w-3 !h-3 !bg-amber-400";

	const headerClasses = isUnused
		? "drag-handle flex items-center justify-between px-4 py-3 bg-slate-500/15 border-b border-slate-500/20 cursor-grab active:cursor-grabbing rounded-t-xl"
		: "drag-handle flex items-center justify-between px-4 py-3 bg-amber-500/15 border-b border-amber-500/20 cursor-grab active:cursor-grabbing rounded-t-xl";

	const iconBgClasses = isUnused
		? "p-1.5 rounded-md bg-slate-500/20"
		: "p-1.5 rounded-md bg-amber-500/20";
	const iconClasses = isUnused
		? "h-4 w-4 text-slate-400"
		: "h-4 w-4 text-amber-400";
	const textClasses = isUnused
		? "text-sm font-bold text-slate-200 truncate max-w-[140px]"
		: "text-sm font-bold text-amber-100 truncate max-w-[140px]";
	const badgeClasses = isUnused
		? "font-mono text-[10px] bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded text-slate-300"
		: "font-mono text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-amber-300";
	const mountClasses = isUnused
		? "text-[10px] font-mono truncate px-2 py-1.5 rounded-md bg-slate-500/5 border border-slate-500/10 text-slate-400/70"
		: "text-[10px] font-mono truncate px-2 py-1.5 rounded-md bg-amber-500/5 border border-amber-500/10 text-amber-300/70";

	return (
		<div className={containerClasses}>
			<Handle
				type="target"
				position={Position.Left}
				className={`${handleClasses} !-left-1.5`}
			/>
			<Handle
				type="source"
				position={Position.Right}
				className={`${handleClasses} !-right-1.5`}
			/>
			<div className={headerClasses}>
				<div className="flex items-center gap-2">
					<div className={iconBgClasses}>
						<HardDrive className={iconClasses} />
					</div>
					<span className={textClasses} title={data.label}>
						{displayName}
					</span>
				</div>
				<span className={badgeClasses}>{data.driver || "local"}</span>
			</div>
			{data.mountpoint && (
				<div className="px-4 py-2.5">
					<div className={mountClasses} title={data.mountpoint}>
						{data.mountpoint}
					</div>
				</div>
			)}
		</div>
	);
}

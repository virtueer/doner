import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageNode({ data }: { data: any }) {
	const formatSize = (bytes: number) => {
		if (!bytes) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const isUsed = data.isUsed !== false;

	return (
		<div
			className={cn(
				"w-[250px] rounded-xl border backdrop-blur-md shadow-lg p-0 overflow-visible relative cursor-pointer transition-all hover:shadow-xl group",
				isUsed
					? "border-pink-500/35 bg-pink-950/50 shadow-[0_4px_20px_rgba(236,72,153,0.08)]"
					: "border-slate-500/35 bg-slate-900/60 shadow-[0_4px_20px_rgba(100,116,139,0.08)]",
			)}
		>
			<div className="flex flex-col">
				<div
					className={cn(
						"flex items-center gap-3 p-3 border-b cursor-grab active:cursor-grabbing rounded-t-xl",
						isUsed
							? "bg-pink-500/10 border-pink-500/15"
							: "bg-slate-500/10 border-slate-500/15",
					)}
				>
					<div
						className={cn(
							"p-2 rounded-lg group-hover:scale-110 transition-all duration-300",
							isUsed ? "bg-pink-500/20" : "bg-slate-500/20",
						)}
					>
						<Layers
							className={cn(
								"w-4 h-4",
								isUsed ? "text-pink-400" : "text-slate-400",
							)}
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
							className={cn(
								"text-[10px] font-medium uppercase tracking-wider mt-1",
								isUsed ? "text-pink-400/60" : "text-slate-400/60",
							)}
						>
							Docker Image
						</div>
					</div>
				</div>

				<div className="p-3">
					<div className="flex flex-col gap-2">
						<div className="flex justify-between items-center text-xs">
							<span
								className={isUsed ? "text-pink-400/60" : "text-slate-400/60"}
							>
								Size:
							</span>
							<span className="font-mono text-white/90">
								{formatSize(data.size)}
							</span>
						</div>
						<div className="flex justify-between items-center text-xs">
							<span
								className={isUsed ? "text-pink-400/60" : "text-slate-400/60"}
							>
								Created:
							</span>
							<span className="font-mono text-white/90">
								{new Date(data.created * 1000).toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

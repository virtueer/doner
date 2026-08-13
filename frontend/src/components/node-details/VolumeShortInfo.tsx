import { memo } from "react";
import { formatBytes } from "./shortInfoUtils";

interface VolumeShortInfoProps {
	data: any;
	systemDf: any;
}

export const VolumeShortInfo = memo(function VolumeShortInfo({
	data,
	systemDf,
}: VolumeShortInfoProps) {
	const dfVol = systemDf?.Volumes?.find((v: any) => v.Name === data.Name);
	const volSize = dfVol?.UsageData?.Size;

	return (
		<div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">Driver:</span>{" "}
				{data.Driver}
			</div>
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">Mountpoint:</span>{" "}
				<span className="truncate max-w-[200px]" title={data.Mountpoint}>
					{data.Mountpoint}
				</span>
			</div>
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">Created:</span>{" "}
				{new Date(data.CreatedAt).toLocaleString()}
			</div>
			{!systemDf ? (
				<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
					<span className="text-xs text-muted-foreground animate-pulse">
						Loading size...
					</span>
				</div>
			) : volSize !== undefined && volSize >= 0 ? (
				<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
					<span className="font-semibold text-foreground/80">Size:</span>{" "}
					<span className="text-emerald-400 font-mono">
						{formatBytes(volSize)}
					</span>
				</div>
			) : (
				<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
					<span className="font-semibold text-foreground/80">Size:</span>{" "}
					<span className="text-muted-foreground font-mono">N/A</span>
				</div>
			)}
		</div>
	);
});

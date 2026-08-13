import { memo } from "react";
import { ContainerSizeInfo } from "./ContainerSizeInfo";
import { SheetStatsBar } from "./SheetStatsBar";
import { formatUptime } from "./shortInfoUtils";

interface ContainerShortInfoProps {
	data: any;
	stats: any;
	systemDf: any;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}

export const ContainerShortInfo = memo(function ContainerShortInfo({
	data,
	stats,
	systemDf,
	handleClose,
	onOpenNode,
}: ContainerShortInfoProps) {
	return (
		<div className="flex flex-col gap-2 mt-2 text-xs text-muted-foreground w-full">
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-1">
					<span className="font-semibold text-foreground/80">ID:</span>{" "}
					{data.Id?.substring(0, 12)}
				</div>
				<div className="flex items-center gap-1">
					<span className="font-semibold text-foreground/80">Image:</span>{" "}
					{data.Config?.Image}
				</div>
				<div className="flex items-center gap-1">
					<span className="font-semibold text-foreground/80">State:</span>
					<span
						className={data.State?.Running ? "text-green-500" : "text-red-500"}
					>
						{data.State?.Status}
					</span>
				</div>
				{data.State?.Running && data.State?.StartedAt && (
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">Uptime:</span>{" "}
						{formatUptime(data.State.StartedAt)}
					</div>
				)}
				<SheetStatsBar stats={stats} />
			</div>

			<ContainerSizeInfo
				data={data}
				systemDf={systemDf}
				handleClose={handleClose}
				onOpenNode={onOpenNode}
			/>
		</div>
	);
});

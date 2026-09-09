import { memo } from "react";
import { InfoItem } from "@/components/common/InfoItem";
import { formatUptime } from "@/lib/format";
import { ContainerSizeInfo } from "./ContainerSizeInfo";
import { SheetStatsBar } from "./SheetStatsBar";

export const ContainerShortInfo = memo(function ContainerShortInfo({
	data,
	stats,
	systemDf,
	handleClose,
	onOpenNode,
}: {
	data: any;
	stats: any;
	systemDf: any;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}) {
	const running = Boolean(data.State?.Running);

	return (
		<div className="mt-2 flex w-full flex-col gap-2 text-xs text-muted-foreground">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
				<InfoItem label="ID">{data.Id?.substring(0, 12)}</InfoItem>
				<InfoItem label="Image">{data.Config?.Image}</InfoItem>
				<InfoItem label="State">
					<span className={running ? "text-success" : "text-destructive"}>
						{data.State?.Status}
					</span>
				</InfoItem>
				{running && data.State?.StartedAt && (
					<InfoItem label="Uptime">
						{formatUptime(data.State.StartedAt)}
					</InfoItem>
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

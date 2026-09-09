import { memo } from "react";
import { InfoItem } from "@/components/common/InfoItem";
import { formatBytes } from "@/lib/format";
import { ContainerShortInfo } from "./ContainerShortInfo";

const ROW =
	"mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground";

interface SheetShortInfoProps {
	nodeType: string;
	isContainer: boolean;
	isVolume: boolean;
	data: any;
	stats: any;
	systemDf: any;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}

export const SheetShortInfo = memo(function SheetShortInfo({
	nodeType,
	isContainer,
	isVolume,
	data,
	stats,
	systemDf,
	handleClose,
	onOpenNode,
}: SheetShortInfoProps) {
	if (!data) return null;

	if (isContainer) {
		return (
			<ContainerShortInfo
				data={data}
				stats={stats}
				systemDf={systemDf}
				handleClose={handleClose}
				onOpenNode={onOpenNode}
			/>
		);
	}

	if (nodeType === "networkNode") {
		return (
			<div className={ROW}>
				<InfoItem label="ID">{data.Id?.substring(0, 12)}</InfoItem>
				<InfoItem label="Driver">{data.Driver}</InfoItem>
				<InfoItem label="Scope">{data.Scope}</InfoItem>
				<InfoItem label="Subnet">
					{data.IPAM?.Config?.[0]?.Subnet || "N/A"}
				</InfoItem>
			</div>
		);
	}

	if (isVolume) {
		const size = systemDf?.Volumes?.find((v: any) => v.Name === data.Name)
			?.UsageData?.Size;

		return (
			<div className={ROW}>
				<InfoItem label="Driver">{data.Driver}</InfoItem>
				<InfoItem
					label="Mountpoint"
					title={data.Mountpoint}
					className="max-w-[280px]"
				>
					{data.Mountpoint}
				</InfoItem>
				<InfoItem label="Created">
					{new Date(data.CreatedAt).toLocaleString()}
				</InfoItem>
				<InfoItem label="Size" className="border-l border-border pl-4">
					{!systemDf ? (
						<span className="animate-pulse">Loading...</span>
					) : size !== undefined && size >= 0 ? (
						<span className="font-mono text-success">{formatBytes(size)}</span>
					) : (
						<span className="font-mono">N/A</span>
					)}
				</InfoItem>
			</div>
		);
	}

	return null;
});

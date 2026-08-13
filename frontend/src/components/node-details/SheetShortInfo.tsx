import { memo } from "react";
import { ContainerShortInfo } from "./ContainerShortInfo";
import { NetworkShortInfo } from "./NetworkShortInfo";
import { VolumeShortInfo } from "./VolumeShortInfo";

interface SheetShortInfoProps {
	nodeType: string;
	isContainer: boolean;
	data: any;
	stats: any;
	systemDf: any;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}

export const SheetShortInfo = memo(function SheetShortInfo({
	nodeType,
	isContainer,
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
		return <NetworkShortInfo data={data} />;
	}

	if (nodeType === "volumeNode") {
		return <VolumeShortInfo data={data} systemDf={systemDf} />;
	}

	return null;
});

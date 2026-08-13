import { memo } from "react";

interface NetworkShortInfoProps {
	data: any;
}

export const NetworkShortInfo = memo(function NetworkShortInfo({
	data,
}: NetworkShortInfoProps) {
	return (
		<div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">ID:</span>{" "}
				{data.Id?.substring(0, 12)}
			</div>
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">Driver:</span>{" "}
				{data.Driver}
			</div>
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">Scope:</span>{" "}
				{data.Scope}
			</div>
			<div className="flex items-center gap-1">
				<span className="font-semibold text-foreground/80">Subnet:</span>{" "}
				{data.IPAM?.Config?.[0]?.Subnet || "N/A"}
			</div>
		</div>
	);
});

import { memo } from "react";
import { formatBytes } from "./shortInfoUtils";

interface ContainerSizeInfoProps {
	data: any;
	systemDf: any;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}

export const ContainerSizeInfo = memo(function ContainerSizeInfo({
	data,
	systemDf,
	handleClose,
	onOpenNode,
}: ContainerSizeInfoProps) {
	if (!systemDf) {
		return (
			<div className="flex flex-col gap-1 border-t border-white/5 pt-2 min-h-[42px] justify-center">
				<span className="text-xs text-muted-foreground animate-pulse">
					Loading size data...
				</span>
			</div>
		);
	}

	const dfContainer = systemDf.Containers?.find(
		(c: any) =>
			c.Id === data.Id ||
			(data.Id && c.Id?.startsWith(data.Id)) ||
			(c.Id && data.Id?.startsWith(c.Id)),
	);
	const sizeRw = dfContainer?.SizeRw;
	const sizeRootFs = dfContainer?.SizeRootFs;

	const dfImage = systemDf.Images?.find(
		(img: any) =>
			img.Id === data.Image ||
			(data.Image && img.Id?.startsWith(data.Image)) ||
			(data.Config?.Image && img.RepoTags?.includes(data.Config.Image)) ||
			(data.Image && img.RepoTags?.includes(data.Image)),
	);

	// Image size: prefer (sizeRootFs - sizeRw) from container df, fallback to image df size
	const imageSize =
		sizeRootFs !== undefined ? sizeRootFs - (sizeRw || 0) : dfImage?.Size;

	const volumes = data.Mounts?.filter((m: any) => m.Type === "volume") || [];

	const hasImage = Boolean(data.Config?.Image || data.Image);
	const hasContainerSize = sizeRw !== undefined || dfContainer !== undefined;
	const hasVolumes = volumes.length > 0;

	return (
		<div className="flex flex-col gap-1 border-t border-white/5 pt-2 min-h-[42px]">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				{hasImage && (
					<div
						className="flex items-center gap-1.5"
						title="Underlying image size"
					>
						<span className="font-semibold text-foreground/80">Image:</span>
						<div
							onClick={() => {
								if (onOpenNode) {
									handleClose();
									onOpenNode(
										`img-${data.Image || data.Config?.Image}`,
										data.Config?.Image || "Image",
										"imageNode",
									);
								}
							}}
							className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
						>
							<span className="truncate max-w-[120px]">
								{data.Config?.Image || "Image"}
							</span>
							{imageSize !== undefined && (
								<span className="text-[10px] opacity-70">
									({formatBytes(imageSize)})
								</span>
							)}
						</div>
					</div>
				)}

				{hasContainerSize && (
					<div
						className="flex items-center gap-1"
						title="Container's writable layer size"
					>
						<span className="font-semibold text-foreground/80">
							Container Size:
						</span>
						<span className="text-purple-400">{formatBytes(sizeRw || 0)}</span>
					</div>
				)}

				{hasVolumes && (
					<div className="flex items-center gap-2">
						<span className="font-semibold text-foreground/80">Volumes:</span>
						<div className="flex flex-wrap gap-1.5">
							{volumes.map((m: any) => {
								const volDf = systemDf.Volumes?.find(
									(v: any) => v.Name === m.Name,
								);
								const size = volDf?.UsageData?.Size;
								return (
									<div
										key={m.Name}
										onClick={() => {
											if (onOpenNode) {
												handleClose();
												onOpenNode(`vol-${m.Name}`, m.Name, "volumeNode");
											}
										}}
										className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
										title={m.Name}
									>
										<span className="truncate max-w-[100px]">{m.Name}</span>
										{size !== undefined && (
											<span className="text-[10px] opacity-70">
												({formatBytes(size)})
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				{!hasImage && !hasContainerSize && !hasVolumes && (
					<span className="text-xs text-muted-foreground">
						No size or volume data available
					</span>
				)}
			</div>
		</div>
	);
});

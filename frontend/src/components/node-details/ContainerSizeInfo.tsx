import { memo } from "react";
import { InfoItem } from "@/components/common/InfoItem";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

function ResourceChip({
	label,
	size,
	accent,
	title,
	onClick,
}: {
	label: string;
	size?: number;
	accent: "image" | "volume";
	title?: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={cn(
				"flex max-w-[180px] items-center gap-1 rounded border px-2 py-0.5 transition-colors",
				accent === "image"
					? "border-image/25 bg-image/10 text-image hover:bg-image/20"
					: "border-volume/25 bg-volume/10 text-volume hover:bg-volume/20",
			)}
		>
			<span className="truncate">{label}</span>
			{size !== undefined && (
				<span className="shrink-0 text-[10px] opacity-70">
					({formatBytes(size)})
				</span>
			)}
		</button>
	);
}

export const ContainerSizeInfo = memo(function ContainerSizeInfo({
	data,
	systemDf,
	handleClose,
	onOpenNode,
}: {
	data: any;
	systemDf: any;
	handleClose: () => void;
	onOpenNode?: (id: string, name: string, type: string) => void;
}) {
	if (!systemDf) {
		return (
			<div className="flex min-h-[42px] items-center border-t border-border pt-2">
				<span className="animate-pulse">Loading size data...</span>
			</div>
		);
	}

	const openNode = (id: string, name: string, type: string) => {
		if (!onOpenNode) return;
		handleClose();
		onOpenNode(id, name, type);
	};

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

	// Prefer the container's rootfs minus its writable layer, else the image df size.
	const imageSize =
		sizeRootFs !== undefined ? sizeRootFs - (sizeRw || 0) : dfImage?.Size;

	const volumes = data.Mounts?.filter((m: any) => m.Type === "volume") ?? [];
	const hasImage = Boolean(data.Config?.Image || data.Image);
	const hasContainerSize = sizeRw !== undefined || dfContainer !== undefined;

	if (!hasImage && !hasContainerSize && volumes.length === 0) {
		return (
			<div className="flex min-h-[42px] items-center border-t border-border pt-2">
				No size or volume data available
			</div>
		);
	}

	return (
		<div className="flex min-h-[42px] flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-2">
			{hasImage && (
				<InfoItem label="Image" title="Underlying image size">
					<ResourceChip
						label={data.Config?.Image || "Image"}
						size={imageSize}
						accent="image"
						onClick={() =>
							openNode(
								`img-${data.Image || data.Config?.Image}`,
								data.Config?.Image || "Image",
								"imageNode",
							)
						}
					/>
				</InfoItem>
			)}

			{hasContainerSize && (
				<InfoItem
					label="Container Size"
					title="Container's writable layer size"
				>
					<span className="text-internal">{formatBytes(sizeRw || 0)}</span>
				</InfoItem>
			)}

			{volumes.length > 0 && (
				<InfoItem label="Volumes" className="items-start">
					<span className="flex flex-wrap gap-1.5">
						{volumes.map((mount: any) => (
							<ResourceChip
								key={mount.Name}
								label={mount.Name}
								title={mount.Name}
								size={
									systemDf.Volumes?.find((v: any) => v.Name === mount.Name)
										?.UsageData?.Size
								}
								accent="volume"
								onClick={() =>
									openNode(`vol-${mount.Name}`, mount.Name, "volumeNode")
								}
							/>
						))}
					</span>
				</InfoItem>
			)}
		</div>
	);
});

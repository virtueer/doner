import { formatBytes, formatUptime } from "@/lib/utils";
import { NodeStats } from "./NodeStats";

export function NodeShortInfo({
	data,
	nodeType,
	isContainer,
	systemDf,
	stats,
	onOpenNode,
	onClose,
}: {
	data: any;
	nodeType: string;
	isContainer: boolean;
	systemDf: any;
	stats: any;
	onOpenNode?: (id: string, name: string, type: string) => void;
	onClose: () => void;
}) {
	if (!data) return null;

	if (isContainer) {
		return (
			<div className="flex flex-col gap-2 mt-2 text-xs text-muted-foreground w-full">
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-1">
						<span className="font-semibold text-foreground/80">State:</span>
						<span
							className={
								data.State?.Running ? "text-green-500" : "text-red-500"
							}
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
					<NodeStats stats={stats} />
				</div>

				{systemDf ? (
					<div className="flex flex-col gap-1 border-t border-white/5 pt-2 min-h-[42px]">
						{(() => {
							const dfContainer = systemDf.Containers?.find(
								(c: any) => c.Id === data.Id,
							);
							const sizeRw = dfContainer?.SizeRw;
							const sizeRootFs = dfContainer?.SizeRootFs;

							const volumes =
								data.Mounts?.filter((m: any) => m.Type === "volume") || [];

							return (
								<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
									{sizeRootFs !== undefined && sizeRw !== undefined && (
										<div
											className="flex items-center gap-1.5"
											title="Underlying image size"
										>
											<span className="font-semibold text-foreground/80">
												Image:
											</span>
											<div
												onClick={() => {
													if (onOpenNode) {
														onClose();
														onOpenNode(
															`img-${data.Image}`,
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
												<span className="text-[10px] opacity-70">
													({formatBytes(sizeRootFs - sizeRw)})
												</span>
											</div>
										</div>
									)}
									{sizeRw !== undefined && (
										<div
											className="flex items-center gap-1"
											title="Container's writable layer size"
										>
											<span className="font-semibold text-foreground/80">
												Container Size:
											</span>
											<span className="text-purple-400">
												{formatBytes(sizeRw)}
											</span>
										</div>
									)}
									{volumes.length > 0 && (
										<div className="flex items-center gap-2">
											<span className="font-semibold text-foreground/80">
												Volumes:
											</span>
											<div className="flex flex-wrap gap-1.5">
												{volumes.map((m: any) => {
													const volDf = systemDf.Volumes?.find(
														(v: any) => v.Name === m.Name,
													);
													const size = volDf?.UsageData?.Size || 0;
													return (
														<div
															key={m.Name}
															onClick={() => {
																if (onOpenNode) {
																	onClose();
																	onOpenNode(
																		`vol-${m.Name}`,
																		m.Name,
																		"volumeNode",
																	);
																}
															}}
															className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
															title={m.Name}
														>
															<span className="truncate max-w-[100px]">
																{m.Name}
															</span>
															<span className="text-[10px] opacity-70">
																({formatBytes(size)})
															</span>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							);
						})()}
					</div>
				) : (
					<div className="flex flex-col gap-1 border-t border-white/5 pt-2 min-h-[42px] justify-center">
						<span className="text-xs text-muted-foreground animate-pulse">
							Loading size data...
						</span>
					</div>
				)}
			</div>
		);
	} else if (nodeType === "networkNode") {
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
	} else if (nodeType === "volumeNode") {
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
				{volSize !== undefined ? (
					<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
						<span className="font-semibold text-foreground/80">Size:</span>{" "}
						<span className="text-emerald-400 font-mono">
							{formatBytes(volSize)}
						</span>
					</div>
				) : (
					<div className="flex items-center gap-1 border-l border-white/10 pl-4 min-w-[120px]">
						<span className="text-xs text-muted-foreground animate-pulse">
							Loading size...
						</span>
					</div>
				)}
			</div>
		);
	}
	return null;
}

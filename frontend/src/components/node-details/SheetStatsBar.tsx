import { memo } from "react";

interface SheetStatsBarProps {
	stats: any;
}

export const SheetStatsBar = memo(function SheetStatsBar({
	stats,
}: SheetStatsBarProps) {
	const formatBytes = (bytes: number, decimals = 2) => {
		if (!+bytes) return "0 Bytes";
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
	};

	if (!stats) {
		return (
			<div className="flex items-center gap-4 border-l border-white/10 pl-4 min-w-[200px] min-h-[24px]">
				<span className="text-xs text-muted-foreground animate-pulse">
					Loading stats...
				</span>
			</div>
		);
	}

	let cpuPercent = 0.0;
	const cpuDelta =
		stats.cpu_stats?.cpu_usage?.total_usage -
		(stats.precpu_stats?.cpu_usage?.total_usage || 0);
	const systemDelta =
		stats.cpu_stats?.system_cpu_usage -
		(stats.precpu_stats?.system_cpu_usage || 0);

	if (systemDelta > 0.0 && cpuDelta > 0.0) {
		const cpus =
			stats.cpu_stats?.online_cpus ||
			stats.cpu_stats?.cpu_usage?.percpu_usage?.length ||
			1;
		cpuPercent = (cpuDelta / systemDelta) * cpus * 100.0;
	}

	const memUsage = stats.memory_stats?.usage || 0;
	const memLimit = stats.memory_stats?.limit || 0;
	const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100.0 : 0.0;

	let ioRead = 0;
	let ioWrite = 0;
	if (stats.blkio_stats?.io_service_bytes_recursive) {
		for (const stat of stats.blkio_stats.io_service_bytes_recursive) {
			if (stat.op?.toLowerCase() === "read") ioRead += stat.value;
			if (stat.op?.toLowerCase() === "write") ioWrite += stat.value;
		}
	}

	return (
		<div className="flex items-center gap-4 border-l border-white/10 pl-4 min-h-[24px]">
			<div className="flex items-center gap-1.5">
				<div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
				<span className="font-semibold text-foreground/80">CPU:</span>
				<span className="font-mono text-blue-400">
					{cpuPercent.toFixed(2)}%
				</span>
			</div>
			<div
				className="flex items-center gap-1.5 cursor-help"
				title={`Usage: ${formatBytes(memUsage)} / Limit: ${formatBytes(memLimit)}`}
			>
				<div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
				<span className="font-semibold text-foreground/80">RAM:</span>
				<span className="font-mono text-purple-400">
					{memPercent.toFixed(2)}%
				</span>
			</div>
			<div
				className="flex items-center gap-1.5 cursor-help"
				title={`Read: ${formatBytes(ioRead)} / Write: ${formatBytes(ioWrite)}`}
			>
				<div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
				<span className="font-semibold text-foreground/80">Disk I/O:</span>
				<span className="font-mono text-yellow-400">
					{formatBytes(ioRead)} / {formatBytes(ioWrite)}
				</span>
			</div>
		</div>
	);
});

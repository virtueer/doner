import { memo } from "react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

function computeStats(stats: any) {
	const cpuDelta =
		stats.cpu_stats?.cpu_usage?.total_usage -
		(stats.precpu_stats?.cpu_usage?.total_usage || 0);
	const systemDelta =
		stats.cpu_stats?.system_cpu_usage -
		(stats.precpu_stats?.system_cpu_usage || 0);
	const cpus =
		stats.cpu_stats?.online_cpus ||
		stats.cpu_stats?.cpu_usage?.percpu_usage?.length ||
		1;
	const cpu =
		systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * cpus * 100 : 0;

	const memUsage = stats.memory_stats?.usage || 0;
	const memLimit = stats.memory_stats?.limit || 0;
	const mem = memLimit > 0 ? (memUsage / memLimit) * 100 : 0;

	let ioRead = 0;
	let ioWrite = 0;
	for (const entry of stats.blkio_stats?.io_service_bytes_recursive ?? []) {
		if (entry.op?.toLowerCase() === "read") ioRead += entry.value;
		if (entry.op?.toLowerCase() === "write") ioWrite += entry.value;
	}

	return { cpu, mem, memUsage, memLimit, ioRead, ioWrite };
}

function Metric({
	dot,
	label,
	value,
	title,
}: {
	dot: string;
	label: string;
	value: string;
	title?: string;
}) {
	return (
		<div
			className={cn("flex items-center gap-1.5", title && "cursor-help")}
			title={title}
		>
			<span className={cn("size-1.5 animate-pulse rounded-full", dot)} />
			<span className="font-medium text-foreground/70">{label}:</span>
			<span className="font-mono">{value}</span>
		</div>
	);
}

export const SheetStatsBar = memo(function SheetStatsBar({
	stats,
}: {
	stats: any;
}) {
	if (!stats) {
		return (
			<div className="min-h-6 min-w-[200px] border-l border-border pl-4">
				<span className="animate-pulse">Loading stats...</span>
			</div>
		);
	}

	const { cpu, mem, memUsage, memLimit, ioRead, ioWrite } = computeStats(stats);

	return (
		<div className="flex min-h-6 items-center gap-4 border-l border-border pl-4">
			<Metric dot="bg-info" label="CPU" value={`${cpu.toFixed(2)}%`} />
			<Metric
				dot="bg-internal"
				label="RAM"
				value={`${mem.toFixed(2)}%`}
				title={`Usage: ${formatBytes(memUsage)} / Limit: ${formatBytes(memLimit)}`}
			/>
			<Metric
				dot="bg-warning"
				label="Disk I/O"
				value={`${formatBytes(ioRead)} / ${formatBytes(ioWrite)}`}
				title={`Read: ${formatBytes(ioRead)} / Write: ${formatBytes(ioWrite)}`}
			/>
		</div>
	);
});

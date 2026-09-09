const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number, decimals = 2): string {
	if (!+bytes) return "0 B";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${parseFloat(value.toFixed(Math.max(0, decimals)))} ${UNITS[i]}`;
}

export function formatUptime(startedAt: string): string {
	const start = new Date(startedAt).getTime();
	if (Number.isNaN(start)) return "Unknown";

	const seconds = Math.floor(Math.max(0, Date.now() - start) / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}

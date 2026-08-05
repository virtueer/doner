import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const formatBytes = (bytes: number, decimals = 2) => {
	if (!+bytes) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

export const formatUptime = (startedAt: string) => {
	const start = new Date(startedAt).getTime();
	if (Number.isNaN(start)) return "Unknown";
	const now = Date.now();
	const diffMs = Math.max(0, now - start);
	const diffSec = Math.floor(diffMs / 1000);

	const m = Math.floor(diffSec / 60);
	const h = Math.floor(m / 60);
	const d = Math.floor(h / 24);

	if (d > 0) return `${d}d ${h % 24}h`;
	if (h > 0) return `${h}h ${m % 60}m`;
	if (m > 0) return `${m}m ${diffSec % 60}s`;
	return `${diffSec}s`;
};

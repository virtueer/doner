import { useEffect, useRef, useState } from "react";
import { renderAnsiLine } from "@/lib/ansi";

interface LogsTerminalProps {
	containerId: string;
	containerName: string;
}

export function LogsTerminal({
	containerId,
	containerName,
}: LogsTerminalProps) {
	const [logs, setLogs] = useState<string[]>([]);
	const [showTimestamps, setShowTimestamps] = useState(true);
	const logsEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.title = `${containerName} — Logs`;
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);

		es.onmessage = (event) => {
			let line: string;
			try {
				const parsed = JSON.parse(event.data);
				line = typeof parsed === "string" ? parsed : String(parsed ?? "");
			} catch {
				line = event.data ?? "";
			}
			if (line) {
				setLogs((prev) => {
					const updated = [...prev, line];
					return updated.length > 2000 ? updated.slice(-2000) : updated;
				});
			}
		};

		es.onerror = () => {
			es.close();
		};

		return () => {
			es.close();
		};
	}, [containerId, containerName]);

	useEffect(() => {
		logsEndRef.current?.scrollIntoView({ behavior: "auto" });
	}, []);

	return (
		<div className="h-screen w-screen bg-[#0c0c0c] text-green-400 flex flex-col font-mono text-sm">
			{/* Prompt */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-green-900/20 bg-[#1a1a1a]">
				<div className="text-green-700 text-xs font-bold">
					$ docker logs -f {containerName}
				</div>
				<button
					onClick={() => setShowTimestamps(!showTimestamps)}
					className="text-xs text-green-600 hover:text-green-500 bg-transparent border border-green-800 rounded px-2 py-1 transition-colors"
				>
					{showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
				</button>
			</div>

			{/* Logs */}
			<div className="flex-1 overflow-auto p-4">
				{logs.length === 0 && (
					<div className="text-green-800 italic">Waiting for logs...</div>
				)}
				{logs.map((line, i) => {
					const spaceIdx = line.indexOf(" ");
					let timestamp = "";
					let content = line;
					if (spaceIdx > 10 && spaceIdx <= 35) {
						const possibleTs = line.substring(0, spaceIdx);
						if (/^\d{4}-\d{2}-\d{2}T/.test(possibleTs)) {
							timestamp = possibleTs;
							content = line.substring(spaceIdx + 1);
						}
					}
					return (
						<div
							key={i}
							className="whitespace-pre-wrap break-all leading-relaxed text-green-400/90 flex gap-3"
						>
							{timestamp && showTimestamps && (
								<span className="shrink-0 text-green-700/80 select-none">
									{timestamp}
								</span>
							)}
							<span className="flex-1">{renderAnsiLine(content)}</span>
						</div>
					);
				})}
				<div ref={logsEndRef} />
			</div>
		</div>
	);
}

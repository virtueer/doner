import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TerminalLogLine } from "./logs-terminal/TerminalLogLine";

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
	const [highlightEnabled, setHighlightEnabled] = useState(true);
	const logsEndRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

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
		if (autoScroll) {
			logsEndRef.current?.scrollIntoView({ behavior: "auto" });
		}
	}, [autoScroll]);

	const handleScroll = useCallback(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
		setAutoScroll(atBottom);
	}, []);

	return (
		<div className="h-screen w-screen bg-[#0f1117] text-gray-300 flex flex-col font-mono text-sm">
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#161822] shrink-0">
				<div className="flex items-center gap-2 text-xs font-bold tracking-wide text-white/40">
					<span className="inline-block w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)] animate-pulse" />
					<span className="text-white/20">$</span> docker logs -f{" "}
					<span className="text-blue-400/80">{containerName}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[11px] text-white/20 mr-1 font-mono">
						{logs.length} lines
					</span>
					<button
						type="button"
						onClick={() => setShowTimestamps(!showTimestamps)}
						className="text-[11px] text-white/40 bg-transparent border border-white/[0.08] rounded px-2.5 py-1.5 transition-all hover:text-white/70 hover:border-white/20 hover:bg-white/[0.04] font-medium"
					>
						{showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
					</button>
					<button
						type="button"
						onClick={() => setHighlightEnabled(!highlightEnabled)}
						className={[
							"text-[11px] rounded px-2.5 py-1.5 transition-all font-medium border",
							highlightEnabled
								? "border-blue-500/30 text-blue-400 bg-blue-500/[0.08] hover:bg-blue-500/[0.15]"
								: "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.04]",
						].join(" ")}
					>
						{highlightEnabled ? "Highlighting" : "Highlight"}
					</button>
				</div>
			</div>

			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto overflow-x-hidden"
			>
				{logs.length === 0 && (
					<div className="text-white/20 italic text-center py-12 text-sm">
						<span className="opacity-50">▌</span> Waiting for logs...
					</div>
				)}

				{logs.map((line, i) => (
					<TerminalLogLine
						key={i}
						line={line}
						index={i}
						showTimestamps={showTimestamps}
						highlightEnabled={highlightEnabled}
					/>
				))}
				<div ref={logsEndRef} />
			</div>

			{!autoScroll && logs.length > 0 && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						setAutoScroll(true);
						logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
					}}
					className="fixed bottom-4 right-4 text-blue-400 border-blue-500/30 font-mono shadow-lg hover:border-blue-500/50 z-[100]"
				>
					↓ Jump to bottom
				</Button>
			)}
		</div>
	);
}

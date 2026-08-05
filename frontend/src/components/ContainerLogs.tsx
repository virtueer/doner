import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderAnsiLine } from "@/lib/ansi";
import { detectLogLevel, highlightLog } from "@/lib/logHighlight";

// --- Sub-component for Logs Streaming ---
export function LogLine({
	line,
	index,
	showTimestamps,
	highlightEnabled,
}: {
	line: string;
	index: number;
	showTimestamps: boolean;
	highlightEnabled: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = contentRef.current;
		if (!el) return;
		setIsOverflowing(el.scrollWidth > el.clientWidth);
	}, []);

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

	const canExpand = isOverflowing;
	const levelInfo = highlightEnabled ? detectLogLevel(line) : null;

	return (
		<div
			onClick={canExpand ? () => setIsExpanded(!isExpanded) : undefined}
			onKeyDown={
				canExpand
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								setIsExpanded(!isExpanded);
							}
						}
					: undefined
			}
			role={canExpand ? "button" : undefined}
			tabIndex={canExpand ? 0 : undefined}
			className={[
				"sheet-log-line group flex items-start gap-0 border-b border-white/[0.04] transition-all duration-150",
				canExpand ? "cursor-pointer" : "",
				isExpanded
					? "bg-white/[0.06] shadow-[inset_3px_0_0_hsl(217,90%,60%)]"
					: "",
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				...(levelInfo && !isExpanded
					? {
							background: levelInfo.bg,
							boxShadow: `inset 2px 0 0 ${levelInfo.color}`,
						}
					: {}),
			}}
		>
			{/* Line number */}
			<div className="min-w-[44px] text-right pr-3 py-[5px] pl-2 text-[11px] text-white/15 select-none border-r border-white/[0.04] shrink-0 font-mono">
				{index + 1}
			</div>

			{/* Expand indicator — only show if expandable */}
			{canExpand ? (
				<div
					className="min-w-[20px] py-[5px] text-center text-[9px] text-white/20 select-none shrink-0 transition-transform duration-200"
					style={{
						transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
					}}
				>
					▶
				</div>
			) : (
				<div className="min-w-[20px] py-[5px] shrink-0" />
			)}

			{/* Timestamp */}
			{timestamp && showTimestamps && (
				<div className="py-[5px] pr-3 text-[11px] text-white/25 select-none shrink-0 whitespace-nowrap font-mono">
					{timestamp}
				</div>
			)}

			{/* Log content */}
			<div
				ref={contentRef}
				className={[
					"flex-1 py-[5px] pr-4 min-w-0 font-mono text-[12.5px] leading-relaxed text-gray-300",
					isExpanded
						? "whitespace-pre-wrap break-all"
						: "whitespace-nowrap overflow-hidden text-ellipsis",
				].join(" ")}
			>
				{highlightEnabled ? highlightLog(content) : renderAnsiLine(content)}
			</div>
		</div>
	);
}

export function ContainerLogs({
	containerId,
	containerName,
}: {
	containerId: string;
	containerName: string;
}) {
	const [logs, setLogs] = useState<string[]>([]);
	const [showTimestamps, setShowTimestamps] = useState(true);
	const [highlightEnabled, setHighlightEnabled] = useState(true);
	const logsEndRef = useRef<HTMLDivElement>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const [autoScroll, setAutoScroll] = useState(true);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);
		eventSourceRef.current = es;

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
					return updated.length > 500 ? updated.slice(-500) : updated;
				});
			}
		};

		es.onerror = () => {
			es.close();
		};

		return () => {
			es.close();
		};
	}, [containerId]);

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

	const openTerminalTab = () => {
		const url = `${window.location.origin}?logs=${encodeURIComponent(containerId)}&name=${encodeURIComponent(containerName)}`;
		window.open(url, "_blank");
	};

	return (
		<div className="flex flex-col h-full bg-[#0f1117] relative">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 bg-[#161822] border-b border-white/[0.06] shrink-0">
				<div className="flex items-center gap-2 text-xs font-mono text-white/40">
					<span className="inline-block w-[7px] h-[7px] rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)] animate-pulse" />
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
						className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.04] transition-all"
					>
						{showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
					</button>
					<button
						type="button"
						onClick={() => setHighlightEnabled(!highlightEnabled)}
						className={[
							"flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all",
							highlightEnabled
								? "border-blue-500/30 text-blue-400 bg-blue-500/[0.08] hover:bg-blue-500/[0.15]"
								: "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.04]",
						].join(" ")}
					>
						{highlightEnabled ? "Highlighting" : "Highlight"}
					</button>
					<button
						type="button"
						onClick={openTerminalTab}
						className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white/90 transition-all"
					>
						<ExternalLink className="h-3 w-3" />
						Open in new tab
					</button>
				</div>
			</div>

			{/* Log Lines */}
			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto overflow-x-hidden"
			>
				{logs.length === 0 && (
					<div className="text-white/20 italic text-center py-8 text-sm">
						<span className="opacity-50">▌</span> Waiting for logs...
					</div>
				)}
				{logs.map((line, i) => (
					<LogLine
						key={i}
						line={line}
						index={i}
						showTimestamps={showTimestamps}
						highlightEnabled={highlightEnabled}
					/>
				))}
				<div ref={logsEndRef} />
			</div>

			{/* Jump to bottom */}
			{!autoScroll && logs.length > 0 && (
				<button
					type="button"
					onClick={() => {
						setAutoScroll(true);
						logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
					}}
					className="absolute bottom-3 right-3 bg-[#1a1d2e] border border-blue-500/30 text-blue-400 rounded-md px-3 py-1.5 text-[11px] font-mono cursor-pointer shadow-lg hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all z-10"
				>
					↓ Jump to bottom
				</button>
			)}

			{/* Hover styles */}
			<style>{`
				.sheet-log-line:hover {
					background: rgba(255, 255, 255, 0.03) !important;
					box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.08);
				}
				.sheet-log-line:hover .min-w-\\[44px\\] {
					color: rgba(255, 255, 255, 0.35) !important;
				}
			`}</style>
		</div>
	);
}

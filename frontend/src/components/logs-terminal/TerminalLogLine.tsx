import { useEffect, useRef, useState } from "react";
import { renderAnsiLine } from "@/lib/ansi";
import { detectLogLevel, highlightLog } from "@/lib/logHighlight";

interface TerminalLogLineProps {
	line: string;
	index: number;
	showTimestamps: boolean;
	highlightEnabled: boolean;
}

export function TerminalLogLine({
	line,
	index,
	showTimestamps,
	highlightEnabled,
}: TerminalLogLineProps) {
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
				"terminal-log-line group flex items-start gap-0 border-b border-white/[0.04] transition-all duration-150",
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
			<div className="min-w-[52px] text-right pr-3 py-[6px] pl-2 text-[11px] text-white/15 select-none border-r border-white/[0.04] shrink-0 font-mono">
				{index + 1}
			</div>

			{canExpand ? (
				<div
					className="min-w-[22px] py-[6px] text-center text-[9px] text-white/20 select-none shrink-0 transition-transform duration-200"
					style={{
						transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
					}}
				>
					▶
				</div>
			) : (
				<div className="min-w-[22px] py-[6px] shrink-0" />
			)}

			{timestamp && showTimestamps && (
				<div className="py-[6px] pr-3 text-[11px] text-white/25 select-none shrink-0 whitespace-nowrap font-mono">
					{timestamp}
				</div>
			)}

			<div
				ref={contentRef}
				className={[
					"flex-1 py-[6px] pr-4 min-w-0 text-[13px] leading-relaxed text-gray-300",
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

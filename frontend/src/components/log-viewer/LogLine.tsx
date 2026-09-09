import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { renderAnsiLine } from "@/lib/ansi";
import { detectLogLevel, highlightLog } from "@/lib/logHighlight";
import { cn } from "@/lib/utils";

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/;

function splitTimestamp(line: string) {
	const idx = line.indexOf(" ");
	if (idx > 10 && idx <= 35) {
		const candidate = line.slice(0, idx);
		if (TIMESTAMP.test(candidate)) {
			return { timestamp: candidate, content: line.slice(idx + 1) };
		}
	}
	return { timestamp: "", content: line };
}

export function LogLine({
	line,
	index,
	showTimestamps,
	highlightEnabled,
	compact = false,
}: {
	line: string;
	index: number;
	showTimestamps: boolean;
	highlightEnabled: boolean;
	compact?: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [canExpand, setCanExpand] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = contentRef.current;
		if (el) setCanExpand(el.scrollWidth > el.clientWidth);
	}, []);

	const { timestamp, content } = splitTimestamp(line);
	const level = highlightEnabled ? detectLogLevel(line) : null;
	const pad = compact ? "py-[5px]" : "py-1.5";

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
			className={cn(
				"log-row flex items-start border-b border-border/50 transition-colors",
				canExpand && "cursor-pointer",
				isExpanded && "bg-accent shadow-[inset_3px_0_0_var(--primary)]",
			)}
			style={
				level && !isExpanded
					? { background: level.bg, boxShadow: `inset 2px 0 0 ${level.color}` }
					: undefined
			}
		>
			<div
				className={cn(
					"shrink-0 select-none border-r border-border/50 pr-3 pl-2 text-right font-mono text-[11px] text-muted-foreground/50",
					compact ? "min-w-[44px]" : "min-w-[52px]",
					pad,
				)}
			>
				{index + 1}
			</div>

			<div
				className={cn(
					"flex shrink-0 select-none justify-center",
					compact ? "min-w-[20px]" : "min-w-[22px]",
					pad,
				)}
			>
				{canExpand && (
					<ChevronRight
						className={cn(
							"size-3 text-muted-foreground/50 transition-transform",
							isExpanded && "rotate-90",
						)}
					/>
				)}
			</div>

			{timestamp && showTimestamps && (
				<div
					className={cn(
						"shrink-0 select-none whitespace-nowrap pr-3 font-mono text-[11px] text-muted-foreground/70",
						pad,
					)}
				>
					{timestamp}
				</div>
			)}

			<div
				ref={contentRef}
				className={cn(
					"min-w-0 flex-1 pr-4 font-mono leading-relaxed",
					compact ? "text-[12.5px]" : "text-[13px]",
					pad,
					isExpanded
						? "whitespace-pre-wrap break-all"
						: "overflow-hidden text-ellipsis whitespace-nowrap",
				)}
			>
				{highlightEnabled ? highlightLog(content) : renderAnsiLine(content)}
			</div>
		</div>
	);
}

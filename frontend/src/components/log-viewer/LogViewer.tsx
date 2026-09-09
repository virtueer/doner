import { ArrowDown, Clock, Highlighter } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useLogStream } from "@/hooks/useLogStream";
import { cn } from "@/lib/utils";
import { LogLine } from "./LogLine";

export function LogViewer({
	containerId,
	containerName,
	maxLines,
	compact = false,
	documentTitle,
	actions,
	className,
}: {
	containerId: string;
	containerName: string;
	maxLines: number;
	compact?: boolean;
	documentTitle?: string;
	actions?: ReactNode;
	className?: string;
}) {
	const [showTimestamps, setShowTimestamps] = useState(true);
	const [highlightEnabled, setHighlightEnabled] = useState(true);
	const { logs, autoScroll, endRef, scrollRef, onScroll, jumpToBottom } =
		useLogStream(containerId, maxLines);

	useEffect(() => {
		if (documentTitle) document.title = documentTitle;
	}, [documentTitle]);

	return (
		<div
			className={cn(
				"relative flex flex-col bg-terminal text-foreground",
				className,
			)}
		>
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-terminal-raised px-4 py-2">
				<div className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground">
					<span className="size-1.5 shrink-0 animate-pulse rounded-full bg-info shadow-[0_0_6px_var(--info)]" />
					<span className="opacity-60">$</span>
					<span className="truncate">
						docker logs -f <span className="text-info">{containerName}</span>
					</span>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<span className="mr-1 font-mono text-[11px] text-muted-foreground">
						{logs.length} lines
					</span>
					<Toggle
						size="sm"
						pressed={showTimestamps}
						onPressedChange={setShowTimestamps}
						title="Toggle timestamps"
					>
						<Clock />
						Timestamps
					</Toggle>
					<Toggle
						size="sm"
						pressed={highlightEnabled}
						onPressedChange={setHighlightEnabled}
						title="Toggle syntax highlighting"
					>
						<Highlighter />
						Highlight
					</Toggle>
					{actions}
				</div>
			</header>

			<div
				ref={scrollRef}
				onScroll={onScroll}
				className="flex-1 overflow-y-auto overflow-x-hidden"
			>
				{logs.length === 0 ? (
					<p className="py-10 text-center text-sm italic text-muted-foreground">
						Waiting for logs...
					</p>
				) : (
					logs.map((line, i) => (
						<LogLine
							key={i}
							line={line}
							index={i}
							showTimestamps={showTimestamps}
							highlightEnabled={highlightEnabled}
							compact={compact}
						/>
					))
				)}
				<div ref={endRef} />
			</div>

			{!autoScroll && logs.length > 0 && (
				<Button
					size="sm"
					variant="outline"
					onClick={jumpToBottom}
					className="absolute bottom-4 right-4 z-10 shadow-lg"
				>
					<ArrowDown />
					Jump to bottom
				</Button>
			)}
		</div>
	);
}

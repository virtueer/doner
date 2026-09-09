import type { Node } from "@xyflow/react";
import { Panel } from "@xyflow/react";
import { Activity, RefreshCw, Search, Sparkles } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { nodeMeta } from "./nodeMeta";

interface AppHeaderProps {
	searchInputRef: React.RefObject<HTMLInputElement | null>;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	isSearchFocused: boolean;
	setIsSearchFocused: (focused: boolean) => void;
	matchedNodes: Node[];
	searchSelectedIndex: number;
	handleSearchKeyDown: (e: React.KeyboardEvent) => void;
	handleSearchSelect: (nodeId: string) => void;
	loading: boolean;
	handleAutoLayout: () => void;
	fetchGraphData: () => void;
	setShowEvents: (show: boolean) => void;
}

const PANEL =
	"rounded-xl border border-border bg-card/80 backdrop-blur-md shadow-xl";

export function AppHeader({
	searchInputRef,
	searchQuery,
	setSearchQuery,
	isSearchFocused,
	setIsSearchFocused,
	matchedNodes,
	searchSelectedIndex,
	handleSearchKeyDown,
	handleSearchSelect,
	loading,
	handleAutoLayout,
	fetchGraphData,
	setShowEvents,
}: AppHeaderProps) {
	return (
		<>
			<Panel position="top-left" className="m-4">
				<div className={cn("relative w-64", PANEL)}>
					<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						placeholder="Search nodes..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => setIsSearchFocused(true)}
						onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
						onKeyDown={handleSearchKeyDown}
						className="h-10 border-0 bg-transparent pl-9 shadow-none"
					/>

					{isSearchFocused && matchedNodes.length > 0 && (
						<div className="absolute top-full left-0 z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
							{matchedNodes.map((n, idx) => {
								const meta = nodeMeta(n.type);
								const Icon = meta.icon;
								const dimmed =
									n.type === "containerNode" && n.data?.state !== "running";

								return (
									<button
										key={n.id}
										type="button"
										onClick={() => handleSearchSelect(n.id)}
										className={cn(
											"flex w-full items-center justify-between px-3 py-2 text-sm transition-colors",
											idx === searchSelectedIndex
												? "bg-accent text-accent-foreground"
												: "hover:bg-accent/60",
										)}
									>
										<span className="flex min-w-0 items-center gap-2">
											<Icon
												className={cn(
													"size-4 shrink-0",
													dimmed ? "text-idle" : meta.text,
												)}
											/>
											<span className="truncate">
												{n.data?.label as string}
											</span>
										</span>
										<span className="ml-2 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
											{meta.label}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</Panel>

			<Panel
				position="top-right"
				className={cn("m-4 flex items-center gap-1 p-1.5", PANEL)}
			>
				{loading && (
					<span className="px-2 text-xs text-muted-foreground animate-pulse">
						Updating...
					</span>
				)}
				<Button variant="ghost" size="sm" onClick={handleAutoLayout}>
					<Sparkles />
					Auto Layout
				</Button>
				<Button variant="ghost" size="sm" onClick={fetchGraphData}>
					<RefreshCw className={cn(loading && "animate-spin")} />
					Refresh
				</Button>
				<Button variant="ghost" size="sm" onClick={() => setShowEvents(true)}>
					<Activity />
					Events
				</Button>
			</Panel>
		</>
	);
}

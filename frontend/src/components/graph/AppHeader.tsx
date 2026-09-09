import type { Node } from "@xyflow/react";
import { Panel } from "@xyflow/react";
import {
	Activity,
	Box,
	Database,
	Layers,
	Network,
	RefreshCw,
	Search,
	Sparkles,
} from "lucide-react";
import type React from "react";

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
			{/* Search Bar (Top Left) */}
			<Panel position="top-left" className="m-4">
				<div className="relative shadow-2xl rounded-xl">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<input
						ref={searchInputRef}
						type="text"
						placeholder="Search nodes..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => setIsSearchFocused(true)}
						onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
						onKeyDown={handleSearchKeyDown}
						className="pl-9 pr-4 py-2.5 bg-card/95 backdrop-blur-md border border-white/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-64 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
					/>
					{isSearchFocused && matchedNodes.length > 0 && (
						<div className="absolute top-full left-0 w-full mt-1 z-50 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
							{matchedNodes.map((n, idx) => {
								let Icon = Box;
								let iconColor = "text-green-500";
								let typeLabel = "Container";

								if (n.type === "networkNode") {
									Icon = Network;
									iconColor = "text-indigo-500";
									typeLabel = "Network";
								} else if (n.type === "volumeNode") {
									Icon = Database;
									iconColor = "text-amber-500";
									typeLabel = "Volume";
								} else if (n.type === "containerNode") {
									Icon = Box;
									iconColor =
										n.data?.state === "running"
											? "text-green-500"
											: "text-slate-400";
									typeLabel = "Container";
								} else if (n.type === "imageNode") {
									Icon = Layers;
									iconColor = "text-pink-500";
									typeLabel = "Image";
								}

								return (
									<div
										key={n.id}
										onClick={() => handleSearchSelect(n.id)}
										className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
											idx === searchSelectedIndex
												? "bg-primary/20 text-primary"
												: "hover:bg-white/5 text-foreground"
										}`}
									>
										<div className="flex items-center gap-2 overflow-hidden">
											<Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
											<span className="truncate">
												{n.data?.label as string}
											</span>
										</div>
										<span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 ml-2">
											{typeLabel}
										</span>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</Panel>

			{/* Floating toolbar top-right */}
			<Panel
				position="top-right"
				className="flex items-center gap-2 m-4 bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
			>
				{loading && (
					<span className="text-xs text-muted-foreground animate-pulse px-2 py-1 rounded">
						Updating...
					</span>
				)}
				<button
					onClick={handleAutoLayout}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-foreground rounded-lg text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all border border-transparent"
					title="Auto arrange nodes"
				>
					<Sparkles className="h-3.5 w-3.5" />
					Auto Layout
				</button>
				<button
					onClick={fetchGraphData}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-foreground rounded-lg text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all border border-transparent"
					title="Refresh data"
				>
					<RefreshCw
						className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
					/>
					Refresh
				</button>
				<button
					onClick={() => setShowEvents(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-foreground rounded-lg text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all border border-transparent ml-2"
					title="View Events"
				>
					<Activity className="h-3.5 w-3.5" />
					Events
				</button>
			</Panel>
		</>
	);
}

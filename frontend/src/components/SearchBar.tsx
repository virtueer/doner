import type { Node } from "@xyflow/react";
import { Box, Database, Layers, Network, Search } from "lucide-react";
import { type RefObject } from "react";

export interface SearchBarProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	isSearchFocused: boolean;
	setIsSearchFocused: (val: boolean) => void;
	matchedNodes: Node[];
	handleSearchSelect: (id: string) => void;
	searchSelectedIndex: number;
	searchInputRef: RefObject<HTMLInputElement | null>;
	handleSearchKeyDown: (e: React.KeyboardEvent) => void;
}

export function SearchBar({
	searchQuery,
	setSearchQuery,
	isSearchFocused,
	setIsSearchFocused,
	matchedNodes,
	handleSearchSelect,
	searchSelectedIndex,
	searchInputRef,
	handleSearchKeyDown,
}: SearchBarProps) {
	return (
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
									<span className="truncate">{n.data?.label as string}</span>
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
	);
}

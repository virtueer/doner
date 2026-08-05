import { Activity, RefreshCw, Sparkles } from "lucide-react";

export interface FlowToolbarProps {
	loading: boolean;
	handleAutoLayout: () => void;
	fetchGraphData: () => void;
	setShowEvents: (val: boolean) => void;
}

export function FlowToolbar({
	loading,
	handleAutoLayout,
	fetchGraphData,
	setShowEvents,
}: FlowToolbarProps) {
	return (
		<>
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
				<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
		</>
	);
}

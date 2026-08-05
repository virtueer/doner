import { Folder, Link as LinkIcon, Play, Search, Terminal } from "lucide-react";

interface NodeDetailsTabsProps {
	activeTab: "inspect" | "logs" | "attach" | "files" | "links";
	setActiveTab: (
		tab: "inspect" | "logs" | "attach" | "files" | "links",
	) => void;
	isContainer: boolean;
	isVolume: boolean;
	hasUnsavedChanges: boolean;
}

export function NodeDetailsTabs({
	activeTab,
	setActiveTab,
	isContainer,
	isVolume,
	hasUnsavedChanges,
}: NodeDetailsTabsProps) {
	return (
		<div className="flex gap-4 mt-4 border-b border-white/5">
			<button
				onClick={() => setActiveTab("inspect")}
				className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
					activeTab === "inspect"
						? "border-primary text-foreground"
						: "border-transparent text-muted-foreground hover:text-foreground"
				}`}
			>
				<div className="flex items-center gap-1.5">
					<Search className="h-4 w-4" />
					Inspect
				</div>
			</button>
			{isContainer && (
				<>
					<button
						onClick={() => setActiveTab("logs")}
						className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
							activeTab === "logs"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center gap-1.5">
							<Terminal className="h-4 w-4" />
							Logs
						</div>
					</button>
					<button
						onClick={() => setActiveTab("attach")}
						className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
							activeTab === "attach"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center gap-1.5">
							<Play className="h-4 w-4" />
							Terminal
						</div>
					</button>
				</>
			)}
			{(isVolume || isContainer) && (
				<button
					onClick={() => setActiveTab("files")}
					className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "files"
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					<div className="flex items-center gap-1.5">
						<Folder className="h-4 w-4" />
						Files
						{hasUnsavedChanges && (
							<div className="w-2 h-2 rounded-full bg-blue-500 ml-1" />
						)}
					</div>
				</button>
			)}
			{isContainer && (
				<button
					onClick={() => setActiveTab("links")}
					className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "links"
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					<div className="flex items-center gap-1.5">
						<LinkIcon className="h-4 w-4" />
						Links
					</div>
				</button>
			)}
		</div>
	);
}

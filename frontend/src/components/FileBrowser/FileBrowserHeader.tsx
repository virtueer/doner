import { ArrowLeft, Download, ExternalLink, Search } from "lucide-react";

interface FileBrowserHeaderProps {
	nodeName: string;
	type: "volume" | "container";
	currentPath: string;
	pathInput: string;
	setPathInput: (path: string) => void;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	isFullscreen: boolean;
	apiPrefix: string;
	handleBack: () => void;
	fetchFiles: (path: string) => void;
	handleExport: () => void;
}

export function FileBrowserHeader({
	nodeName,
	type,
	currentPath,
	pathInput,
	setPathInput,
	searchQuery,
	setSearchQuery,
	isFullscreen,
	apiPrefix,
	handleBack,
	fetchFiles,
	handleExport,
}: FileBrowserHeaderProps) {
	return (
		<div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-white/5 shrink-0">
			<div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
				<button
					onClick={handleBack}
					disabled={currentPath === "/"}
					className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent text-white/80 shrink-0 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
				</button>
				<div className="flex items-center text-xs text-white/70 font-mono shrink-0">
					{nodeName}:
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						fetchFiles(pathInput);
					}}
					className="flex-1 max-w-full"
				>
					<input
						value={pathInput}
						onChange={(e) => setPathInput(e.target.value)}
						className="w-full bg-transparent border border-transparent focus:border-blue-500/50 rounded px-1 py-0.5 text-xs text-white/90 font-mono outline-none transition-colors"
						placeholder="/path/to/folder"
					/>
				</form>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<div className="relative shrink-0 flex items-center mr-2">
					<Search className="absolute left-2 h-3.5 w-3.5 text-white/40" />
					<input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search files..."
						className="pl-7 pr-2 py-1 w-32 focus:w-48 transition-all bg-black/20 border border-white/10 focus:border-blue-500/50 rounded-md text-xs text-white/90 outline-none"
					/>
				</div>
				{!isFullscreen && (
					<button
						onClick={() => {
							const url = `${window.location.origin}?files=true&apiPrefix=${encodeURIComponent(apiPrefix)}&name=${encodeURIComponent(nodeName)}&type=${type}`;
							window.open(url, "_blank");
						}}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md transition-colors border border-white/20"
					>
						<ExternalLink className="h-3.5 w-3.5" />
						Open in new tab
					</button>
				)}
				{type === "volume" && (
					<button
						onClick={handleExport}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-md transition-colors border border-blue-500/20"
					>
						<Download className="h-3.5 w-3.5" />
						Export
					</button>
				)}
			</div>
		</div>
	);
}

import { ArrowLeft, Download, ExternalLink, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FileActionDialogs } from "./file-browser/FileActionDialogs";
import { FileContextMenu } from "./file-browser/FileContextMenu";
import { FileEditorModal } from "./file-browser/FileEditorModal";
import { FileListTable } from "./file-browser/FileListTable";
import { getGlobalClipboard } from "./file-browser/fileBrowserUtils";
import { useFileOperations } from "./file-browser/useFileOperations";

export function FileBrowser({
	apiPrefix,
	nodeName,
	type,
	mounts = [],
	isFullscreen = false,
	onUnsavedChangesChange,
}: {
	apiPrefix: string;
	nodeName: string;
	type: "volume" | "container";
	mounts?: any[];
	isFullscreen?: boolean;
	onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [contextMenu, setContextMenu] = useState<{
		visible: boolean;
		x: number;
		y: number;
		file: any;
	} | null>(null);

	const {
		currentPath,
		pathInput,
		setPathInput,
		searchQuery,
		setSearchQuery,
		files,
		loading,
		error,
		viewFile,
		fileLoading,
		isEditing,
		setIsEditing,
		editContent,
		setEditContent,
		fileContent,
		saving,
		selectedLanguage,
		setSelectedLanguage,
		copiedFile,
		setCopiedFile,
		dialog,
		fetchFiles,
		handleFileClick,
		handleSave,
		handleCloseFileView,
		handleBack,
		handleCopy,
		handlePaste,
		handleMkdir,
		handleNewFile,
		handleRename,
		handleDelete,
	} = useFileOperations(apiPrefix, onUnsavedChangesChange);

	useEffect(() => {
		const handleClick = () => setContextMenu(null);
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, []);

	const handleExport = () => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		window.open(`${apiUrl}${apiPrefix}/export`, "_blank");
	};

	const handleExportItem = (file: any) => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		window.open(
			`${apiUrl}${apiPrefix}/export?path=${encodeURIComponent(file.path)}`,
			"_blank",
		);
	};

	const handleContextMenu = (e: React.MouseEvent, file: any) => {
		e.preventDefault();
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();

		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;

		const menuWidth = 192;
		const menuHeight = 220;
		if (x + menuWidth > rect.width) x = rect.width - menuWidth;
		if (y + menuHeight > rect.height) y = rect.height - menuHeight;

		setContextMenu({
			visible: true,
			x: Math.max(0, x),
			y: Math.max(0, y),
			file,
		});
	};

	const handleEditContext = (file: any) => {
		if (file.type !== "file") return;
		handleFileClick(file).then(() => {
			setIsEditing(true);
		});
	};

	const isMountPoint = (filePath: string) => {
		if (!mounts || mounts.length === 0) return false;
		const absolutePath = filePath.startsWith("/") ? filePath : `/${filePath}`;
		return mounts.some(
			(m: any) =>
				m.Destination === absolutePath || m.Destination === `${absolutePath}/`,
		);
	};

	const filteredFiles = files.filter((f) =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div
			className="flex flex-col h-full bg-[#1e1e1e] relative"
			ref={containerRef}
		>
			<div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-white/5">
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

			<div
				className="flex-1 overflow-hidden relative"
				onContextMenu={(e) => {
					e.preventDefault();
					if (!containerRef.current) return;
					const rect = containerRef.current.getBoundingClientRect();
					let x = e.clientX - rect.left;
					let y = e.clientY - rect.top;
					const menuWidth = 192;
					const menuHeight = 220;
					if (x + menuWidth > rect.width) x = rect.width - menuWidth;
					if (y + menuHeight > rect.height) y = rect.height - menuHeight;

					setContextMenu({
						visible: true,
						x: Math.max(0, x),
						y: Math.max(0, y),
						file: null,
					});
				}}
			>
				{viewFile ? (
					<FileEditorModal
						viewFile={viewFile}
						fileLoading={fileLoading}
						isEditing={isEditing}
						setIsEditing={setIsEditing}
						saving={saving}
						selectedLanguage={selectedLanguage}
						setSelectedLanguage={setSelectedLanguage}
						editContent={editContent}
						setEditContent={setEditContent}
						fileContent={fileContent}
						handleSave={handleSave}
						handleCloseFileView={handleCloseFileView}
					/>
				) : null}

				{loading ? (
					<div className="p-4 text-white/50 text-sm animate-pulse">
						Loading directory...
					</div>
				) : error ? (
					<div className="p-4 text-red-400 text-sm">{error}</div>
				) : filteredFiles.length === 0 ? (
					<div className="p-4 text-white/40 text-sm italic">
						{files.length === 0
							? "Empty directory"
							: "No files match your search"}
					</div>
				) : (
					<FileListTable
						files={filteredFiles}
						isMountPoint={isMountPoint}
						handleFileClick={handleFileClick}
						handleContextMenu={handleContextMenu}
					/>
				)}
			</div>

			{contextMenu && (
				<FileContextMenu
					contextMenu={contextMenu}
					apiPrefix={apiPrefix}
					globalClipboard={getGlobalClipboard()}
					setContextMenu={setContextMenu}
					handleEditContext={handleEditContext}
					handleRename={handleRename}
					handleCopy={handleCopy}
					handleExportItem={handleExportItem}
					handleNewFile={handleNewFile}
					handleMkdir={handleMkdir}
					handlePaste={handlePaste}
					handleDelete={handleDelete}
				/>
			)}

			<FileActionDialogs
				dialog={dialog}
				copiedFile={copiedFile}
				setCopiedFile={setCopiedFile}
			/>
		</div>
	);
}

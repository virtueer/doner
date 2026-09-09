import { ArrowLeft, Download, Search } from "lucide-react";
import { memo } from "react";
import { AppDialog } from "@/components/common/AppDialog";
import { OpenInNewTab } from "@/components/common/OpenInNewTab";
import { CopiedFileBanner } from "@/components/file-browser/CopiedFileBanner";
import {
	FileContextMenu,
	type FileMenuActions,
} from "@/components/file-browser/FileContextMenu";
import { FileEditorModal } from "@/components/file-browser/FileEditorModal";
import { FileListTable } from "@/components/file-browser/FileListTable";
import { getGlobalClipboard } from "@/components/file-browser/fileBrowserUtils";
import { useFileOperations } from "@/components/file-browser/useFileOperations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api";

export const FileBrowser = memo(function FileBrowser({
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

	const exportUrl = (path?: string) =>
		`${API_URL}${apiPrefix}/export${path ? `?path=${encodeURIComponent(path)}` : ""}`;

	const actions: FileMenuActions = {
		onEdit: (file) => handleFileClick(file).then(() => setIsEditing(true)),
		onRename: handleRename,
		onCopy: handleCopy,
		onExport: (file) => window.open(exportUrl(file.path), "_blank"),
		onDelete: handleDelete,
		onNewFile: handleNewFile,
		onNewFolder: handleMkdir,
		onPaste: handlePaste,
	};

	const clipboard = getGlobalClipboard();
	const canPaste = Boolean(clipboard && clipboard.apiPrefix === apiPrefix);

	const isMountPoint = (filePath: string) => {
		if (mounts.length === 0) return false;
		const absolute = filePath.startsWith("/") ? filePath : `/${filePath}`;
		return mounts.some(
			(m: any) =>
				m.Destination === absolute || m.Destination === `${absolute}/`,
		);
	};

	const filteredFiles = files.filter((f) =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div className="relative flex h-full flex-col bg-surface">
			<header className="flex items-center justify-between gap-4 border-b border-border bg-surface-raised px-4 py-2">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleBack}
						disabled={currentPath === "/"}
					>
						<ArrowLeft />
					</Button>
					<span className="shrink-0 font-mono text-xs text-muted-foreground">
						{nodeName}:
					</span>
					<form
						className="min-w-0 flex-1"
						onSubmit={(e) => {
							e.preventDefault();
							fetchFiles(pathInput);
						}}
					>
						<Input
							value={pathInput}
							onChange={(e) => setPathInput(e.target.value)}
							placeholder="/path/to/folder"
							className="h-7 border-transparent bg-transparent font-mono text-xs"
						/>
					</form>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search files..."
							className="h-7 w-32 pl-7 text-xs transition-all focus:w-48"
						/>
					</div>
					{!isFullscreen && (
						<OpenInNewTab
							params={{
								files: "true",
								apiPrefix,
								name: nodeName,
								type,
							}}
						/>
					)}
					{type === "volume" && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => window.open(exportUrl(), "_blank")}
						>
							<Download />
							Export
						</Button>
					)}
				</div>
			</header>

			<FileContextMenu
				canPaste={canPaste}
				actions={actions}
				className="relative flex-1 overflow-hidden"
			>
				{viewFile && (
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
				)}

				{loading ? (
					<p className="animate-pulse p-4 text-sm text-muted-foreground">
						Loading directory...
					</p>
				) : error ? (
					<p className="p-4 text-sm text-destructive">{error}</p>
				) : filteredFiles.length === 0 ? (
					<p className="p-4 text-sm italic text-muted-foreground">
						{files.length === 0
							? "Empty directory"
							: "No files match your search"}
					</p>
				) : (
					<FileListTable
						files={filteredFiles}
						isMountPoint={isMountPoint}
						canPaste={canPaste}
						actions={actions}
						onOpen={handleFileClick}
					/>
				)}
			</FileContextMenu>

			<CopiedFileBanner
				item={copiedFile}
				onDismiss={() => setCopiedFile(null)}
			/>
			<AppDialog dialog={dialog} />
		</div>
	);
});

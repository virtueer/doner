import { Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDialogs } from "@/hooks/useDialogs";
import { useFileOperations } from "@/hooks/useFileOperations";
import { FileBrowserHeader } from "./FileBrowser/FileBrowserHeader";
import { FileContextMenu } from "./FileBrowser/FileContextMenu";
import { FileTable } from "./FileBrowser/FileTable";
import { FileViewer } from "./FileBrowser/FileViewer";

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
	const [currentPath, setCurrentPath] = useState("/");
	const [pathInput, setPathInput] = useState("/");
	const [searchQuery, setSearchQuery] = useState("");
	const [files, setFiles] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [viewFile, setViewFile] = useState<string | null>(null);
	const [viewFilePath, setViewFilePath] = useState<string | null>(null);
	const [fileContent, setFileContent] = useState<string>("");
	const [selectedLanguage, setSelectedLanguage] = useState("plaintext");
	const [fileLoading, setFileLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState("");
	const [saving, setSaving] = useState(false);

	// Context Menu State
	const [contextMenu, setContextMenu] = useState<{
		visible: boolean;
		x: number;
		y: number;
		file: any;
	} | null>(null);
	const [copiedFile, setCopiedFile] = useState<{
		path: string;
		name: string;
		type: "file" | "directory";
	} | null>(null);

	const { dialog, showAlert, showConfirm, showPrompt } = useDialogs();

	const filteredFiles = files.filter((f) =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const ops = useFileOperations({
		apiPrefix,
		currentPath,
		files,
		setFiles,
		setCurrentPath,
		setPathInput,
		setLoading,
		setError,
		setViewFile,
		setViewFilePath,
		setFileContent,
		setEditContent,
		setSelectedLanguage,
		setFileLoading,
		setIsEditing,
		setSaving,
		setCopiedFile,
		showAlert,
		showPrompt,
		showConfirm,
	});

	useEffect(() => {
		ops.fetchFiles("/");
	}, [ops.fetchFiles]);

	useEffect(() => {
		const handleClick = () => setContextMenu(null);
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, []);

	const hasUnsavedChanges = isEditing && editContent !== fileContent;
	useEffect(() => {
		if (onUnsavedChangesChange) {
			onUnsavedChangesChange(hasUnsavedChanges);
		}
	}, [hasUnsavedChanges, onUnsavedChangesChange]);

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

	return (
		<div
			className="flex flex-col h-full bg-[#1e1e1e] relative"
			ref={containerRef}
		>
			<FileBrowserHeader
				nodeName={nodeName}
				type={type}
				currentPath={currentPath}
				pathInput={pathInput}
				setPathInput={setPathInput}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				isFullscreen={isFullscreen}
				apiPrefix={apiPrefix}
				handleBack={ops.handleBack}
				fetchFiles={ops.fetchFiles}
				handleExport={ops.handleExport}
			/>

			<div
				className="flex-1 overflow-hidden relative"
				onContextMenu={(e) => {
					// Allow pasting when right clicking on the empty area
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
						file: null, // null means we clicked on the background
					});
				}}
			>
				{viewFile ? (
					<FileViewer
						viewFile={viewFile}
						selectedLanguage={selectedLanguage}
						setSelectedLanguage={setSelectedLanguage}
						fileLoading={fileLoading}
						isEditing={isEditing}
						setIsEditing={setIsEditing}
						saving={saving}
						fileContent={fileContent}
						editContent={editContent}
						setEditContent={setEditContent}
						handleSave={() => ops.handleSave(viewFilePath, editContent)}
						handleCloseFileView={() =>
							ops.handleCloseFileView(hasUnsavedChanges)
						}
					/>
				) : null}

				{loading ? (
					<div className="p-4 text-white/50 text-sm animate-pulse">
						Loading directory...
					</div>
				) : error ? (
					<div className="p-4 text-red-400 text-sm">{error}</div>
				) : (
					<FileTable
						files={files}
						filteredFiles={filteredFiles}
						mounts={mounts}
						handleFileClick={ops.handleFileClick}
						handleContextMenu={handleContextMenu}
					/>
				)}
			</div>

			<FileContextMenu
				contextMenu={contextMenu}
				apiPrefix={apiPrefix}
				onClose={() => setContextMenu(null)}
				onEdit={ops.handleEditContext}
				onRename={ops.handleRename}
				onCopy={ops.handleCopy}
				onExport={ops.handleExportItem}
				onDelete={ops.handleDelete}
				onNewFile={ops.handleNewFile}
				onMkdir={ops.handleMkdir}
				onPaste={ops.handlePaste}
			/>

			{/* Copied File Indicator */}
			{copiedFile && (
				<div className="absolute bottom-4 right-4 z-40 bg-blue-500/10 border border-blue-500/20 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-xs">
					<div className="bg-blue-500/20 p-1.5 rounded-md shrink-0">
						<Copy className="h-4 w-4 text-blue-400" />
					</div>
					<div className="flex flex-col overflow-hidden min-w-0">
						<span
							className="text-xs font-medium text-white/90 truncate"
							title={copiedFile.name}
						>
							Copied {copiedFile.type === "directory" ? "folder" : "file"}:{" "}
							{copiedFile.name}
						</span>
						<span
							className="text-[10px] text-white/50 truncate"
							title={copiedFile.path}
						>
							{copiedFile.path}
						</span>
					</div>
					<button
						onClick={() => setCopiedFile(null)}
						className="p-1 hover:bg-white/10 rounded-md transition-colors shrink-0 text-white/40 hover:text-white/80"
					>
						<X className="h-3 w-3" />
					</button>
				</div>
			)}
			{/* Dialog Modal */}
			{dialog && <ConfirmDialog dialog={dialog} />}
		</div>
	);
}

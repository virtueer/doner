import {
	ClipboardPaste,
	Copy,
	Download,
	Edit2,
	FilePlus,
	FolderPlus,
	Trash2,
	Type,
} from "lucide-react";
import type { ClipboardItem } from "./fileBrowserUtils";

interface ContextMenuState {
	visible: boolean;
	x: number;
	y: number;
	file: any;
}

interface FileContextMenuProps {
	contextMenu: ContextMenuState;
	apiPrefix: string;
	globalClipboard: ClipboardItem | null;
	setContextMenu: (menu: ContextMenuState | null) => void;
	handleEditContext: (file: any) => void;
	handleRename: (file: any) => void;
	handleCopy: (file: any) => void;
	handleExportItem: (file: any) => void;
	handleNewFile: () => void;
	handleMkdir: () => void;
	handlePaste: () => void;
	handleDelete: (file: any) => void;
}

export function FileContextMenu({
	contextMenu,
	apiPrefix,
	globalClipboard,
	setContextMenu,
	handleEditContext,
	handleRename,
	handleCopy,
	handleExportItem,
	handleNewFile,
	handleMkdir,
	handlePaste,
	handleDelete,
}: FileContextMenuProps) {
	if (!contextMenu.visible) return null;

	return (
		<div
			className="absolute z-50 bg-[#2a2a2a] border border-white/10 rounded-md shadow-2xl py-1 w-48 text-sm"
			style={{ top: contextMenu.y, left: contextMenu.x }}
			onClick={(e) => e.stopPropagation()}
		>
			{contextMenu.file && contextMenu.file.type === "file" && (
				<button
					className="w-full text-left px-4 py-2 hover:bg-blue-500/20 hover:text-blue-400 text-white/90 flex items-center gap-2 transition-colors"
					onClick={() => {
						handleEditContext(contextMenu.file);
						setContextMenu(null);
					}}
				>
					<Edit2 className="h-4 w-4" /> Edit
				</button>
			)}
			{contextMenu.file && (
				<>
					<button
						className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
						onClick={() => {
							handleRename(contextMenu.file);
							setContextMenu(null);
						}}
					>
						<Type className="h-4 w-4" /> Rename
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
						onClick={() => {
							handleCopy(contextMenu.file);
							setContextMenu(null);
						}}
					>
						<Copy className="h-4 w-4" /> Copy
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-blue-500/20 text-blue-400 flex items-center gap-2 transition-colors"
						onClick={() => {
							handleExportItem(contextMenu.file);
							setContextMenu(null);
						}}
					>
						<Download className="h-4 w-4" /> Export
					</button>
				</>
			)}
			{!contextMenu.file && (
				<>
					<button
						className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
						onClick={() => {
							handleNewFile();
							setContextMenu(null);
						}}
					>
						<FilePlus className="h-4 w-4" /> New File
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
						onClick={() => {
							handleMkdir();
							setContextMenu(null);
						}}
					>
						<FolderPlus className="h-4 w-4" /> New Folder
					</button>
				</>
			)}
			<button
				className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
				disabled={!globalClipboard || globalClipboard.apiPrefix !== apiPrefix}
				onClick={() => {
					handlePaste();
					setContextMenu(null);
				}}
			>
				<ClipboardPaste className="h-4 w-4" /> Paste
			</button>
			{contextMenu.file && (
				<>
					<div className="h-px bg-white/10 my-1" />
					<button
						className="w-full text-left px-4 py-2 hover:bg-red-500/20 hover:text-red-400 text-red-500 flex items-center gap-2 transition-colors"
						onClick={() => {
							handleDelete(contextMenu.file);
							setContextMenu(null);
						}}
					>
						<Trash2 className="h-4 w-4" /> Delete
					</button>
				</>
			)}
		</div>
	);
}

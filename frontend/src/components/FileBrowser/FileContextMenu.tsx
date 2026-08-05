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
import { globalClipboard } from "@/lib/fileUtils";

export function FileContextMenu({
	contextMenu,
	apiPrefix,
	onClose,
	onEdit,
	onRename,
	onCopy,
	onExport,
	onDelete,
	onNewFile,
	onMkdir,
	onPaste,
}: {
	contextMenu: { visible: boolean; x: number; y: number; file: any } | null;
	apiPrefix: string;
	onClose: () => void;
	onEdit: (file: any) => void;
	onRename: (file: any) => void;
	onCopy: (file: any) => void;
	onExport: (file: any) => void;
	onDelete: (file: any) => void;
	onNewFile: () => void;
	onMkdir: () => void;
	onPaste: () => void;
}) {
	if (!contextMenu?.visible) return null;

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
						onEdit(contextMenu.file);
						onClose();
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
							onRename(contextMenu.file);
							onClose();
						}}
					>
						<Type className="h-4 w-4" /> Rename
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
						onClick={() => {
							onCopy(contextMenu.file);
							onClose();
						}}
					>
						<Copy className="h-4 w-4" /> Copy
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-blue-500/20 text-blue-400 flex items-center gap-2 transition-colors"
						onClick={() => {
							onExport(contextMenu.file);
							onClose();
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
							onNewFile();
							onClose();
						}}
					>
						<FilePlus className="h-4 w-4" /> New File
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
						onClick={() => {
							onMkdir();
							onClose();
						}}
					>
						<FolderPlus className="h-4 w-4" /> New Folder
					</button>
				</>
			)}
			<button
				className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
				disabled={
					!globalClipboard.current ||
					globalClipboard.current.apiPrefix !== apiPrefix
				}
				onClick={() => {
					onPaste();
					onClose();
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
							onDelete(contextMenu.file);
							onClose();
						}}
					>
						<Trash2 className="h-4 w-4" /> Delete
					</button>
				</>
			)}
		</div>
	);
}

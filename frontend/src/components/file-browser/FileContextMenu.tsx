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
import type { ReactElement, ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

export interface FileMenuActions {
	onEdit: (file: any) => void;
	onRename: (file: any) => void;
	onCopy: (file: any) => void;
	onExport: (file: any) => void;
	onDelete: (file: any) => void;
	onNewFile: () => void;
	onNewFolder: () => void;
	onPaste: () => void;
}

export function FileContextMenu({
	file,
	canPaste,
	actions,
	render,
	className,
	children,
}: {
	file?: any;
	canPaste: boolean;
	actions: FileMenuActions;
	render?: ReactElement;
	className?: string;
	children: ReactNode;
}) {
	return (
		<ContextMenu>
			<ContextMenuTrigger render={render} className={className}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				{file?.type === "file" && (
					<ContextMenuItem onClick={() => actions.onEdit(file)}>
						<Edit2 /> Edit
					</ContextMenuItem>
				)}

				{file ? (
					<>
						<ContextMenuItem onClick={() => actions.onRename(file)}>
							<Type /> Rename
						</ContextMenuItem>
						<ContextMenuItem onClick={() => actions.onCopy(file)}>
							<Copy /> Copy
						</ContextMenuItem>
						<ContextMenuItem onClick={() => actions.onExport(file)}>
							<Download /> Export
						</ContextMenuItem>
					</>
				) : (
					<>
						<ContextMenuItem onClick={actions.onNewFile}>
							<FilePlus /> New File
						</ContextMenuItem>
						<ContextMenuItem onClick={actions.onNewFolder}>
							<FolderPlus /> New Folder
						</ContextMenuItem>
					</>
				)}

				<ContextMenuItem disabled={!canPaste} onClick={actions.onPaste}>
					<ClipboardPaste /> Paste
				</ContextMenuItem>

				{file && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem
							variant="destructive"
							onClick={() => actions.onDelete(file)}
						>
							<Trash2 /> Delete
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}

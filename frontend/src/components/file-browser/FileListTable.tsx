import { Database, FileText, Folder, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/lib/format";
import { FileContextMenu, type FileMenuActions } from "./FileContextMenu";

function FileIcon({ file, isMount }: { file: any; isMount: boolean }) {
	if (isMount) return <Database className="size-4 shrink-0 text-internal" />;
	if (file.type === "directory")
		return <Folder className="size-4 shrink-0 text-volume" />;
	if (file.type === "symlink")
		return <Link className="size-4 shrink-0 text-info" />;
	return <FileText className="size-4 shrink-0 text-muted-foreground" />;
}

export function FileListTable({
	files,
	isMountPoint,
	canPaste,
	actions,
	onOpen,
}: {
	files: any[];
	isMountPoint: (path: string) => boolean;
	canPaste: boolean;
	actions: FileMenuActions;
	onOpen: (file: any) => void;
}) {
	return (
		<div className="h-full overflow-y-auto p-2">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-full pl-2">Name</TableHead>
						<TableHead className="w-[1%] whitespace-nowrap px-4 text-right">
							Size
						</TableHead>
						<TableHead className="w-[1%] whitespace-nowrap pr-4 text-right">
							Modified
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{files.map((file) => {
						const isMount = isMountPoint(file.path);
						const modified = new Date(file.mtime).toLocaleString();

						return (
							<FileContextMenu
								key={file.path}
								file={file}
								canPaste={canPaste}
								actions={actions}
								render={
									<TableRow
										onClick={() => onOpen(file)}
										className="group h-10 cursor-pointer"
									/>
								}
							>
								<TableCell className="max-w-0 overflow-hidden py-2 pl-2">
									<div className="flex min-w-0 items-center gap-2">
										<FileIcon file={file} isMount={isMount} />
										<span
											className="truncate text-sm transition-colors group-hover:text-primary"
											title={file.name}
										>
											{file.name}
										</span>
										{isMount && (
											<Badge
												variant="outline"
												className="shrink-0 text-internal"
											>
												Mount
											</Badge>
										)}
										{file.type === "symlink" && (
											<Badge variant="outline" className="shrink-0 text-info">
												Shortcut
											</Badge>
										)}
									</div>
								</TableCell>
								<TableCell className="whitespace-nowrap px-4 py-2 text-right font-mono text-xs text-muted-foreground">
									{formatBytes(file.size)}
								</TableCell>
								<TableCell
									className="whitespace-nowrap py-2 pr-4 text-right text-xs text-muted-foreground"
									title={modified}
								>
									{modified}
								</TableCell>
							</FileContextMenu>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

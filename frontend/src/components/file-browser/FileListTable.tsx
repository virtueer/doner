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
import { formatBytes } from "./fileBrowserUtils";

interface FileListTableProps {
	files: any[];
	isMountPoint: (filePath: string) => boolean;
	handleFileClick: (file: any) => void;
	handleContextMenu: (e: React.MouseEvent, file: any) => void;
}

export function FileListTable({
	files,
	isMountPoint,
	handleFileClick,
	handleContextMenu,
}: FileListTableProps) {
	return (
		<div className="overflow-y-auto h-full p-2">
			<Table>
				<TableHeader>
					<TableRow className="border-b border-white/10 text-xs text-muted-foreground font-medium">
						<TableHead className="w-full">Name</TableHead>
						<TableHead className="whitespace-nowrap w-[1%] text-right">
							Size
						</TableHead>
						<TableHead className="whitespace-nowrap w-[1%] pr-4 text-right">
							Modified
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{files.map((f, i) => {
						const isMount = isMountPoint(f.path);
						return (
							<TableRow
								key={i}
								onClick={() => handleFileClick(f)}
								onContextMenu={(e) => {
									e.stopPropagation();
									handleContextMenu(e, f);
								}}
								className="cursor-pointer group h-10"
							>
								<TableCell className="max-w-0 overflow-hidden">
									<div className="flex items-center gap-2 min-w-0">
										{isMount ? (
											<Database className="h-4 w-4 text-purple-500 shrink-0" />
										) : f.type === "directory" ? (
											<Folder className="h-4 w-4 text-amber-500 shrink-0" />
										) : f.type === "symlink" ? (
											<Link className="h-4 w-4 text-cyan-400 shrink-0" />
										) : (
											<FileText className="h-4 w-4 text-slate-400 shrink-0" />
										)}
										<span
											className="text-sm text-foreground truncate group-hover:text-primary transition-colors"
											title={f.name}
										>
											{f.name}
										</span>
										{isMount && (
											<Badge
												variant="secondary"
												className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-1.5 py-0 shrink-0"
											>
												Mount
											</Badge>
										)}
										{f.type === "symlink" && (
											<Badge
												variant="secondary"
												className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] px-1.5 py-0 shrink-0"
											>
												Shortcut
											</Badge>
										)}
									</div>
								</TableCell>
								<TableCell
									className="whitespace-nowrap text-xs text-muted-foreground font-mono text-right"
									title={formatBytes(f.size)}
								>
									{formatBytes(f.size)}
								</TableCell>
								<TableCell
									className="whitespace-nowrap text-xs text-muted-foreground pr-4 text-right"
									title={new Date(f.mtime).toLocaleString()}
								>
									{new Date(f.mtime).toLocaleString()}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

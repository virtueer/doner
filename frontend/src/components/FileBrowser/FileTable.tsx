import { Database, FileText, Folder, Link } from "lucide-react";
import React from "react";

interface FileTableProps {
	files: any[];
	filteredFiles: any[];
	mounts?: any[];
	handleFileClick: (file: any) => void;
	handleContextMenu: (e: React.MouseEvent, file: any) => void;
}

export function FileTable({
	files,
	filteredFiles,
	mounts = [],
	handleFileClick,
	handleContextMenu,
}: FileTableProps) {
	const isMountPoint = (filePath: string) => {
		if (!mounts || mounts.length === 0) return false;
		const absolutePath = filePath.startsWith("/") ? filePath : `/${filePath}`;
		return mounts.some(
			(m: any) =>
				m.Destination === absolutePath || m.Destination === `${absolutePath}/`,
		);
	};

	const formatBytes = (bytes: number, decimals = 2) => {
		if (!+bytes) return "0 B";
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
	};

	if (filteredFiles.length === 0) {
		return (
			<div className="p-4 text-white/40 text-sm italic">
				{files.length === 0 ? "Empty directory" : "No files match your search"}
			</div>
		);
	}

	return (
		<div className="overflow-y-auto h-full p-2">
			<table className="w-full text-left border-collapse table-auto">
				<thead>
					<tr className="border-b border-white/5 text-xs text-white/40 font-medium">
						<th className="pb-2 font-normal pl-2 w-full">Name</th>
						<th className="pb-2 font-normal px-4 whitespace-nowrap w-[1%] text-right">
							Size
						</th>
						<th className="pb-2 font-normal whitespace-nowrap w-[1%] pr-4 text-right">
							Modified
						</th>
					</tr>
				</thead>
				<tbody>
					{filteredFiles.map((f, i) => {
						const isMount = isMountPoint(f.path);
						return (
							<tr
								key={i}
								onClick={() => handleFileClick(f)}
								onContextMenu={(e) => {
									e.stopPropagation();
									handleContextMenu(e, f);
								}}
								className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group h-10"
							>
								<td className="py-2 pl-2 max-w-0 overflow-hidden">
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
											className="text-sm text-white/90 truncate group-hover:text-blue-400 transition-colors"
											title={f.name}
										>
											{f.name}
										</span>
										{isMount && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 ml-1 shrink-0">
												Mount
											</span>
										)}
										{f.type === "symlink" && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 ml-1 shrink-0">
												Shortcut
											</span>
										)}
									</div>
								</td>
								<td
									className="py-2 px-4 whitespace-nowrap text-xs text-white/50 font-mono"
									title={formatBytes(f.size)}
								>
									{formatBytes(f.size)}
								</td>
								<td
									className="py-2 whitespace-nowrap text-xs text-white/50 pr-4"
									title={new Date(f.mtime).toLocaleString()}
								>
									{new Date(f.mtime).toLocaleString()}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

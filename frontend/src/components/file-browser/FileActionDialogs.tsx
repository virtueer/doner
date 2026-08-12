import { Copy, X } from "lucide-react";
import type { ClipboardItem } from "./fileBrowserUtils";

export interface DialogState {
	isOpen: boolean;
	type: "alert" | "confirm" | "prompt";
	title: string;
	message: string;
	defaultValue?: string;
	onConfirm?: (value?: string) => void;
	onCancel?: () => void;
}

interface FileActionDialogsProps {
	dialog: DialogState | null;
	copiedFile: ClipboardItem | null;
	setCopiedFile: (item: ClipboardItem | null) => void;
}

export function FileActionDialogs({
	dialog,
	copiedFile,
	setCopiedFile,
}: FileActionDialogsProps) {
	return (
		<>
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
			{dialog?.isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
					<div className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
							<h3 className="text-base font-medium text-white/90">
								{dialog.title}
							</h3>
							<button
								onClick={() => dialog.onCancel?.()}
								className="text-white/40 hover:text-white/80 transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="px-5 py-5">
							<p className="text-sm text-white/70 mb-4">{dialog.message}</p>
							{dialog.type === "prompt" && (
								<input
									type="text"
									defaultValue={dialog.defaultValue}
									className="w-full bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 outline-none focus:border-blue-500/50 transition-colors"
									onKeyDown={(e) => {
										if (e.key === "Enter")
											dialog.onConfirm?.((e.target as HTMLInputElement).value);
										if (e.key === "Escape") dialog.onCancel?.();
									}}
									id="dialog-prompt-input"
								/>
							)}
						</div>
						<div className="px-5 py-4 bg-[#151515] flex items-center justify-end gap-3 border-t border-white/10">
							{dialog.type !== "alert" && (
								<button
									onClick={() => dialog.onCancel?.()}
									className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/5 rounded-md transition-colors"
								>
									Cancel
								</button>
							)}
							<button
								onClick={() => {
									if (dialog.type === "prompt") {
										const val = (
											document.getElementById(
												"dialog-prompt-input",
											) as HTMLInputElement
										)?.value;
										dialog.onConfirm?.(val);
									} else {
										dialog.onConfirm?.();
									}
								}}
								className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
									dialog.type === "confirm" &&
									dialog.title.toLowerCase().includes("delete")
										? "bg-red-500 hover:bg-red-600 text-white"
										: "bg-blue-500 hover:bg-blue-600 text-white"
								}`}
							>
								{dialog.type === "alert"
									? "OK"
									: dialog.type === "confirm"
										? "Confirm"
										: "Submit"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

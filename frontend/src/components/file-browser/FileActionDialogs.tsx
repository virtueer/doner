import { Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
							className="text-xs font-medium text-foreground truncate"
							title={copiedFile.name}
						>
							Copied {copiedFile.type === "directory" ? "folder" : "file"}:{" "}
							{copiedFile.name}
						</span>
						<span
							className="text-[10px] text-muted-foreground truncate"
							title={copiedFile.path}
						>
							{copiedFile.path}
						</span>
					</div>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={() => setCopiedFile(null)}
						className="shrink-0"
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
			)}

			{/* Dialog Modal */}
			{dialog?.isOpen && (
				<Dialog
					open={dialog.isOpen}
					onOpenChange={(open) => {
						if (!open) dialog.onCancel?.();
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{dialog.title}</DialogTitle>
							<DialogDescription>{dialog.message}</DialogDescription>
						</DialogHeader>

						{dialog.type === "prompt" && (
							<div className="py-2">
								<Input
									type="text"
									defaultValue={dialog.defaultValue}
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter")
											dialog.onConfirm?.((e.target as HTMLInputElement).value);
										if (e.key === "Escape") dialog.onCancel?.();
									}}
									id="dialog-prompt-input"
								/>
							</div>
						)}

						<DialogFooter className="gap-2 sm:gap-0">
							{dialog.type !== "alert" && (
								<Button variant="outline" onClick={() => dialog.onCancel?.()}>
									Cancel
								</Button>
							)}
							<Button
								variant={
									dialog.type === "confirm" &&
									dialog.title.toLowerCase().includes("delete")
										? "destructive"
										: "default"
								}
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
							>
								{dialog.type === "alert"
									? "OK"
									: dialog.type === "confirm"
										? "Confirm"
										: "Submit"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}

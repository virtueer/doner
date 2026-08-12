import { X } from "lucide-react";

export type DialogState = {
	isOpen: boolean;
	type: "alert" | "confirm" | "prompt";
	title: string;
	message: string;
	defaultValue?: string;
	onConfirm?: (value?: string) => void;
	onCancel?: () => void;
};

export function ConfirmDialog({ dialog }: { dialog: DialogState }) {
	if (!dialog.isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
			<div className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				<div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
					<h3 className="text-base font-medium text-white/90">
						{dialog.title}
					</h3>
					<button
						type="button"
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
							type="button"
							onClick={() => dialog.onCancel?.()}
							className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/5 rounded-md transition-colors"
						>
							Cancel
						</button>
					)}
					<button
						type="button"
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
	);
}

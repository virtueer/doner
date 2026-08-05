import { X } from "lucide-react";
import { useState } from "react";

export interface ConfirmDialogState {
	isOpen: boolean;
	title: string;
	message: string;
	isDeleteStep2?: boolean;
	showForceOption?: boolean;
	onConfirm: (force?: boolean) => void;
	onCancel: () => void;
}

export function ConfirmModal({
	confirmDialog,
}: {
	confirmDialog: ConfirmDialogState | null;
}) {
	const [forceCheck, setForceCheck] = useState(false);

	if (!confirmDialog?.isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
			<div
				className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
					<h3
						className={`text-base font-medium ${confirmDialog.isDeleteStep2 ? "text-red-500" : "text-white/90"}`}
					>
						{confirmDialog.title}
					</h3>
					<button
						onClick={confirmDialog.onCancel}
						className="text-white/40 hover:text-white/80 transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="px-5 py-5">
					<p
						className={`text-sm ${confirmDialog.showForceOption ? "mb-4" : ""} ${confirmDialog.isDeleteStep2 ? "text-red-400 font-medium" : "text-white/70"}`}
					>
						{confirmDialog.message}
					</p>
					{confirmDialog.showForceOption && (
						<label className="flex items-center gap-2 mt-4 text-sm text-white/80 cursor-pointer w-fit">
							<input
								type="checkbox"
								checked={forceCheck}
								onChange={(e) => setForceCheck(e.target.checked)}
								className="rounded border-white/20 bg-black/20 text-red-500 focus:ring-red-500/50"
							/>
							Force delete (even if running/used)
						</label>
					)}
				</div>
				<div className="px-5 py-4 bg-[#151515] flex items-center justify-end gap-3 border-t border-white/10">
					<button
						onClick={confirmDialog.onCancel}
						className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/5 rounded-md transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={() => confirmDialog.onConfirm(forceCheck)}
						className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${confirmDialog.isDeleteStep2 ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
					>
						{confirmDialog.isDeleteStep2 ? "Yes, DELETE it" : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogState {
	isOpen: boolean;
	title: string;
	message: string;
	isDeleteStep2?: boolean;
	showForceOption?: boolean;
	onConfirm: (force?: boolean) => void;
	onCancel: () => void;
}

interface NodeActionDialogsProps {
	confirmDialog: ConfirmDialogState | null;
	forceCheck: boolean;
	setForceCheck: (check: boolean) => void;
}

export function NodeActionDialogs({
	confirmDialog,
	forceCheck,
	setForceCheck,
}: NodeActionDialogsProps) {
	if (!confirmDialog?.isOpen) return null;

	return (
		<Dialog
			open={confirmDialog.isOpen}
			onOpenChange={(open) => {
				if (!open) confirmDialog.onCancel();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle
						className={
							confirmDialog.isDeleteStep2
								? "text-destructive"
								: "text-foreground"
						}
					>
						{confirmDialog.title}
					</DialogTitle>
					<DialogDescription
						className={
							confirmDialog.isDeleteStep2
								? "text-destructive/90 font-medium"
								: "text-muted-foreground"
						}
					>
						{confirmDialog.message}
					</DialogDescription>
				</DialogHeader>

				{confirmDialog.showForceOption && (
					<div className="py-2">
						<label className="flex items-center gap-2 text-sm text-foreground/90 cursor-pointer w-fit">
							<input
								type="checkbox"
								checked={forceCheck}
								onChange={(e) => setForceCheck(e.target.checked)}
								className="rounded border-input bg-background text-destructive focus:ring-destructive/50"
							/>
							Force delete (even if running/used)
						</label>
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={confirmDialog.onCancel}>
						Cancel
					</Button>
					<Button
						variant={confirmDialog.isDeleteStep2 ? "destructive" : "default"}
						onClick={() => confirmDialog.onConfirm(forceCheck)}
					>
						{confirmDialog.isDeleteStep2 ? "Yes, DELETE it" : "Confirm"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

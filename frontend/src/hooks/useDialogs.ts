import { useState } from "react";
import type { DialogState } from "@/components/ui/ConfirmDialog";

export function useDialogs() {
	const [dialog, setDialog] = useState<DialogState | null>(null);

	const showAlert = (title: string, message: string) => {
		return new Promise<void>((resolve) => {
			setDialog({
				isOpen: true,
				type: "alert",
				title,
				message,
				onConfirm: () => {
					setDialog(null);
					resolve();
				},
				onCancel: () => {
					setDialog(null);
					resolve();
				},
			});
		});
	};

	const showConfirm = (title: string, message: string) => {
		return new Promise<boolean>((resolve) => {
			setDialog({
				isOpen: true,
				type: "confirm",
				title,
				message,
				onConfirm: () => {
					setDialog(null);
					resolve(true);
				},
				onCancel: () => {
					setDialog(null);
					resolve(false);
				},
			});
		});
	};

	const showPrompt = (title: string, message: string, defaultValue = "") => {
		return new Promise<string | null>((resolve) => {
			setDialog({
				isOpen: true,
				type: "prompt",
				title,
				message,
				defaultValue,
				onConfirm: (val) => {
					setDialog(null);
					resolve(val || null);
				},
				onCancel: () => {
					setDialog(null);
					resolve(null);
				},
			});
		});
	};

	return { dialog, setDialog, showAlert, showConfirm, showPrompt };
}

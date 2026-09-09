import { type ReactNode, useEffect, useState } from "react";
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

export interface DialogState {
	isOpen: boolean;
	kind: "alert" | "confirm" | "prompt";
	title: string;
	message: string;
	defaultValue?: string;
	confirmLabel?: string;
	destructive?: boolean;
	onConfirm?: (value?: string) => void;
	onCancel?: () => void;
}

export function AppDialog({
	dialog,
	children,
}: {
	dialog: DialogState | null;
	children?: ReactNode;
}) {
	const [value, setValue] = useState("");

	useEffect(() => {
		if (dialog?.isOpen) setValue(dialog.defaultValue ?? "");
	}, [dialog?.isOpen, dialog?.defaultValue]);

	if (!dialog?.isOpen) return null;

	const { kind, destructive, onConfirm, onCancel } = dialog;
	const confirm = () => onConfirm?.(kind === "prompt" ? value : undefined);
	const confirmLabel =
		dialog.confirmLabel ?? (kind === "alert" ? "OK" : "Confirm");

	return (
		<Dialog open onOpenChange={(open) => !open && onCancel?.()}>
			<DialogContent
				className="sm:max-w-md"
				onKeyDown={(e) => {
					if (e.key === "Enter" && kind === "prompt") confirm();
				}}
			>
				<DialogHeader>
					<DialogTitle className={destructive ? "text-destructive" : undefined}>
						{dialog.title}
					</DialogTitle>
					<DialogDescription
						className={destructive ? "text-destructive/90" : undefined}
					>
						{dialog.message}
					</DialogDescription>
				</DialogHeader>

				{kind === "prompt" && (
					<Input
						autoFocus
						value={value}
						onChange={(e) => setValue(e.target.value)}
						className="h-9"
					/>
				)}

				{children}

				<DialogFooter>
					{kind !== "alert" && (
						<Button variant="ghost" onClick={() => onCancel?.()}>
							Cancel
						</Button>
					)}
					<Button
						variant={destructive ? "destructive" : "default"}
						onClick={confirm}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

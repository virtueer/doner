import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribeToToasts, type Toast, type ToastType } from "@/lib/toast";
import { cn } from "@/lib/utils";

const VARIANTS: Record<ToastType, { icon: typeof Info; className: string }> = {
	success: {
		icon: CheckCircle2,
		className: "border-success/25 bg-success/10 text-success",
	},
	error: {
		icon: AlertCircle,
		className: "border-destructive/25 bg-destructive/10 text-destructive",
	},
	info: {
		icon: Info,
		className: "border-border bg-popover text-popover-foreground",
	},
};

export function ToastContainer() {
	const [toasts, setToasts] = useState<Toast[]>([]);
	useEffect(() => subscribeToToasts(setToasts), []);

	return (
		<div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
			{toasts.map((toast) => {
				const { icon: Icon, className } = VARIANTS[toast.type];
				return (
					<div
						key={toast.id}
						className={cn(
							"pointer-events-auto flex min-w-[280px] items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl backdrop-blur-md",
							"animate-in fade-in slide-in-from-right-8 duration-300",
							className,
						)}
					>
						<Icon className="size-5 shrink-0" />
						<span className="font-medium">{toast.message}</span>
					</div>
				);
			})}
		</div>
	);
}

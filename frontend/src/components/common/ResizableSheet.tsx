import type { ReactNode } from "react";
import { useResizableWidth } from "@/hooks/useResizableWidth";
import { cn } from "@/lib/utils";

export function ResizableSheet({
	onClose,
	initial,
	min,
	max = 0.95,
	className,
	children,
}: {
	onClose: () => void;
	initial: number;
	min: number;
	max?: number;
	className?: string;
	children: ReactNode;
}) {
	const { width, startResize } = useResizableWidth({ initial, min, max });

	return (
		<>
			<div
				className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div
				className={cn(
					"fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-card shadow-2xl animate-slide-in-right",
					className,
				)}
				style={{ width }}
			>
				<div
					className="group absolute inset-y-0 -ml-1 left-0 z-50 flex w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-primary/20"
					onMouseDown={startResize}
				>
					<div className="h-8 w-1 rounded-full bg-border transition-colors group-hover:bg-primary" />
				</div>
				{children}
			</div>
		</>
	);
}

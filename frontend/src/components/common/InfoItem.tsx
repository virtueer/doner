import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InfoItem({
	label,
	title,
	className,
	children,
}: {
	label: string;
	title?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn("flex items-center gap-1.5", className)} title={title}>
			<span className="font-medium text-foreground/70">{label}:</span>
			<span className="min-w-0 truncate">{children}</span>
		</div>
	);
}

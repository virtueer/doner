import { Handle, type HandleProps, Position } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NodeAccent =
	| "container"
	| "internal"
	| "network"
	| "volume"
	| "image"
	| "idle";

const ACCENT: Record<
	NodeAccent,
	{ card: string; header: string; chip: string; body: string; dot: string }
> = {
	container: {
		card: "border-container/35 bg-container/5 shadow-container/10",
		header: "bg-container/10 border-container/15",
		chip: "bg-container/20 text-container",
		body: "bg-container/5 border-container/15 text-container/90",
		dot: "bg-container shadow-[0_0_6px_var(--container)]",
	},
	internal: {
		card: "border-internal/35 bg-internal/5 shadow-internal/10",
		header: "bg-internal/10 border-internal/15",
		chip: "bg-internal/20 text-internal",
		body: "bg-internal/5 border-internal/15 text-internal/90",
		dot: "bg-internal shadow-[0_0_6px_var(--internal)]",
	},
	network: {
		card: "border-network/35 bg-network/5 shadow-network/10",
		header: "bg-network/10 border-network/15",
		chip: "bg-network/20 text-network",
		body: "bg-network/5 border-network/15 text-network/90",
		dot: "bg-network shadow-[0_0_6px_var(--network)]",
	},
	volume: {
		card: "border-volume/35 bg-volume/5 shadow-volume/10",
		header: "bg-volume/10 border-volume/15",
		chip: "bg-volume/20 text-volume",
		body: "bg-volume/5 border-volume/15 text-volume/90",
		dot: "bg-volume shadow-[0_0_6px_var(--volume)]",
	},
	image: {
		card: "border-image/35 bg-image/5 shadow-image/10",
		header: "bg-image/10 border-image/15",
		chip: "bg-image/20 text-image",
		body: "bg-image/5 border-image/15 text-image/90",
		dot: "bg-image shadow-[0_0_6px_var(--image)]",
	},
	idle: {
		card: "border-idle/35 bg-idle/5 shadow-idle/10",
		header: "bg-idle/10 border-idle/15",
		chip: "bg-idle/20 text-idle",
		body: "bg-idle/5 border-idle/15 text-idle/90",
		dot: "bg-idle shadow-[0_0_6px_var(--idle)]",
	},
};

export function NodeHandle({
	accent,
	className,
	...props
}: HandleProps & { accent: NodeAccent }) {
	return (
		<Handle
			className={cn(
				"!size-3 !border-0",
				ACCENT[accent].dot,
				props.position === Position.Left ? "!-left-1.5" : "!-right-1.5",
				className,
			)}
			{...props}
		/>
	);
}

export function GraphNode({
	accent,
	icon: Icon,
	title,
	tooltip,
	titleMax = "max-w-[180px]",
	badge,
	children,
	className,
	handles,
}: {
	accent: NodeAccent;
	icon: LucideIcon;
	title: string;
	tooltip?: string;
	titleMax?: string;
	badge?: ReactNode;
	children?: ReactNode;
	className?: string;
	handles?: ReactNode;
}) {
	const styles = ACCENT[accent];

	return (
		<div
			className={cn(
				"relative overflow-visible rounded-xl border backdrop-blur-md shadow-lg transition-shadow hover:shadow-xl",
				styles.card,
				className,
			)}
		>
			{handles}
			<div
				className={cn(
					"drag-handle flex items-center justify-between gap-2 rounded-t-xl border-b px-4 py-3 cursor-grab active:cursor-grabbing",
					styles.header,
				)}
			>
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn("rounded-md p-1.5", styles.chip)}>
						<Icon className="size-4" />
					</div>
					<span
						className={cn("truncate text-sm font-semibold", titleMax)}
						title={tooltip ?? title}
					>
						{title}
					</span>
				</div>
				{badge}
			</div>
			{children && <div className="px-4 py-2.5">{children}</div>}
		</div>
	);
}

export function NodeBadge({
	accent,
	className,
	children,
}: {
	accent: NodeAccent;
	className?: string;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
				ACCENT[accent].chip,
				className,
			)}
		>
			{children}
		</span>
	);
}

export function NodeField({
	accent,
	children,
	title,
}: {
	accent: NodeAccent;
	children: ReactNode;
	title?: string;
}) {
	return (
		<div
			className={cn(
				"truncate rounded-md border px-2 py-1.5 font-mono text-[11px]",
				ACCENT[accent].body,
			)}
			title={title}
		>
			{children}
		</div>
	);
}

export function NodeStatus({
	accent,
	label,
}: {
	accent: NodeAccent;
	label: string;
}) {
	return (
		<div className="flex shrink-0 items-center gap-1.5">
			<span className={cn("size-2.5 rounded-full", ACCENT[accent].dot)} />
			<span className="text-[10px] font-medium capitalize text-muted-foreground">
				{label}
			</span>
		</div>
	);
}

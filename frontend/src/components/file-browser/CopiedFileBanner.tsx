import { Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClipboardItem } from "./fileBrowserUtils";

export function CopiedFileBanner({
	item,
	onDismiss,
}: {
	item: ClipboardItem | null;
	onDismiss: () => void;
}) {
	if (!item) return null;

	return (
		<div className="absolute bottom-4 right-4 z-40 flex max-w-xs items-center gap-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
			<div className="shrink-0 rounded-md bg-primary/20 p-1.5">
				<Copy className="size-4 text-primary" />
			</div>
			<div className="flex min-w-0 flex-col">
				<span className="truncate text-xs font-medium" title={item.name}>
					Copied {item.type === "directory" ? "folder" : "file"}: {item.name}
				</span>
				<span
					className="truncate text-[10px] text-muted-foreground"
					title={item.path}
				>
					{item.path}
				</span>
			</div>
			<Button
				variant="ghost"
				size="icon-xs"
				onClick={onDismiss}
				className="shrink-0"
			>
				<X />
			</Button>
		</div>
	);
}

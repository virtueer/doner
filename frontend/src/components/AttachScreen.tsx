import { Terminal } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AttachTerminal } from "./AttachTerminal";

export function AttachScreen({
	containerId,
	containerName,
	shell,
	isSidecar,
	sidecarImage = "alpine",
}: {
	containerId: string;
	containerName: string;
	shell: string;
	isSidecar?: boolean;
	sidecarImage?: string;
}) {
	useEffect(() => {
		const suffix = isSidecar ? ` [sidecar: ${sidecarImage}]` : "";
		document.title = `${containerName} — Attach (${shell})${suffix}`;
	}, [containerName, shell, isSidecar, sidecarImage]);

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-terminal">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-terminal-raised px-4 py-2">
				<div className="flex min-w-0 items-center gap-2">
					<Terminal className="size-4 shrink-0 text-success" />
					<span className="truncate text-sm font-semibold">
						{containerName}
					</span>
					<span className="shrink-0 text-xs text-muted-foreground">
						attach ({shell})
					</span>
					{isSidecar && (
						<Badge variant="outline" className="shrink-0 text-volume">
							sidecar: {sidecarImage}
						</Badge>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
					<span className="size-2 animate-pulse rounded-full bg-success" />
					connected
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-hidden p-2">
				<AttachTerminal
					containerId={containerId}
					shell={shell}
					isSidecar={isSidecar}
					sidecarImage={sidecarImage}
				/>
			</div>
		</div>
	);
}

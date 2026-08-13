import { Terminal } from "lucide-react";
import { useEffect } from "react";
import { AttachTerminal } from "./AttachTerminal";

interface AttachScreenProps {
	containerId: string;
	containerName: string;
	shell: string;
	isSidecar?: boolean;
	sidecarImage?: string;
}

export function AttachScreen({
	containerId,
	containerName,
	shell,
	isSidecar,
	sidecarImage = "alpine",
}: AttachScreenProps) {
	useEffect(() => {
		const sidecarLabel = isSidecar ? ` [sidecar: ${sidecarImage}]` : "";
		document.title = `${containerName} — Attach (${shell})${sidecarLabel}`;
	}, [containerName, shell, isSidecar, sidecarImage]);

	return (
		<div className="absolute inset-0 bg-[#0c0c0c] text-green-400 flex flex-col font-mono text-sm overflow-hidden">
			{/* Header bar */}
			<div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30 shrink-0">
				<div className="flex items-center gap-2">
					<Terminal className="h-4 w-4 text-green-500" />
					<span className="text-sm text-green-300 font-semibold">
						{containerName}
					</span>
					<span className="text-xs text-green-700">
						— attach ({shell})
						{isSidecar && (
							<span className="ml-1 text-xs text-amber-500/80">
								[sidecar: {sidecarImage}]
							</span>
						)}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
					<span className="text-xs text-green-600">connected</span>
				</div>
			</div>

			{/* Terminal Container */}
			<div className="flex-1 min-h-0 overflow-hidden p-2 pb-2">
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

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AttachTerminal } from "./AttachTerminal";

export function AttachTab({
	containerId,
	containerName,
}: {
	containerId: string;
	containerName: string;
}) {
	const [attachShell, setAttachShell] = useState("/bin/sh");
	const [attachMode, setAttachMode] = useState<"none" | "normal" | "sidecar">(
		"none",
	);

	return (
		<div className="flex flex-col h-full bg-[#0c0c0c] relative">
			<div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30">
				<div className="flex items-center gap-2">
					<select
						value={attachShell}
						onChange={(e) => setAttachShell(e.target.value)}
						disabled={attachMode !== "none"}
						className="bg-[#2a2a2a] text-xs text-white px-2 py-1 rounded border border-white/10 outline-none"
					>
						<option value="/bin/sh">/bin/sh</option>
						<option value="/bin/bash">/bin/bash</option>
					</select>
					{attachMode === "none" ? (
						<>
							<Button
								size="sm"
								className="bg-green-600 hover:bg-green-500 text-white"
								onClick={() => setAttachMode("normal")}
							>
								Connect
							</Button>
							<Button
								size="sm"
								variant="destructive"
								onClick={() => setAttachMode("sidecar")}
							>
								Connect with Sidecar
							</Button>
						</>
					) : (
						<Button
							size="sm"
							variant="destructive"
							onClick={() => setAttachMode("none")}
						>
							Disconnect
						</Button>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							const sidecarParam =
								attachMode === "sidecar" ? "&sidecar=true" : "";
							const url = `${window.location.origin}?attach=${encodeURIComponent(containerId)}&shell=${encodeURIComponent(attachShell)}&name=${encodeURIComponent(containerName)}${sidecarParam}`;
							window.open(url, "_blank");
						}}
					>
						<ExternalLink className="h-3 w-3" />
						Open in new tab
					</Button>
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-hidden">
				{attachMode !== "none" ? (
					<AttachTerminal
						containerId={containerId}
						shell={attachShell}
						isSidecar={attachMode === "sidecar"}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
						Select a shell and click Connect to start an interactive session.
					</div>
				)}
			</div>
		</div>
	);
}

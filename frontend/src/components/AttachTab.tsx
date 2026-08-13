import { ExternalLink } from "lucide-react";
import { memo, useState } from "react";
import { AttachTerminal } from "./AttachTerminal";

export const AttachTab = memo(function AttachTab({
	containerId,
	containerName,
}: {
	containerId: string;
	containerName: string;
}) {
	const [attachShell, setAttachShell] = useState("/bin/sh");
	const [sidecarImage, setSidecarImage] = useState("alpine");
	const [attachMode, setAttachMode] = useState<"none" | "normal" | "sidecar">(
		"none",
	);

	return (
		<div className="flex flex-col h-full bg-[#0c0c0c] relative">
			<div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-muted-foreground font-medium">
							Shell:
						</span>
						<select
							value={attachShell}
							onChange={(e) => setAttachShell(e.target.value)}
							disabled={attachMode !== "none"}
							className="bg-[#2a2a2a] text-xs text-white px-2 py-1 rounded border border-white/10 outline-none"
						>
							<option value="/bin/sh">/bin/sh</option>
							<option value="/bin/bash">/bin/bash</option>
						</select>
					</div>

					<div className="flex items-center gap-1.5">
						<span className="text-xs text-muted-foreground font-medium">
							Sidecar:
						</span>
						<select
							value={sidecarImage}
							onChange={(e) => setSidecarImage(e.target.value)}
							disabled={attachMode !== "none"}
							className="bg-[#2a2a2a] text-xs text-white px-2 py-1 rounded border border-white/10 outline-none"
						>
							<option value="alpine">alpine</option>
							<option value="debian:stable-slim">debian:stable-slim</option>
						</select>
					</div>

					{attachMode === "none" ? (
						<>
							<button
								onClick={() => setAttachMode("normal")}
								className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
							>
								Connect
							</button>
							<button
								onClick={() => setAttachMode("sidecar")}
								className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
							>
								Connect with Sidecar
							</button>
						</>
					) : (
						<button
							onClick={() => setAttachMode("none")}
							className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
						>
							Disconnect
						</button>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							const sidecarParam =
								attachMode === "sidecar"
									? `&sidecar=true&sidecarImage=${encodeURIComponent(sidecarImage)}`
									: "";
							const url = `${window.location.origin}?attach=${encodeURIComponent(containerId)}&shell=${encodeURIComponent(attachShell)}&name=${encodeURIComponent(containerName)}${sidecarParam}`;
							window.open(url, "_blank");
						}}
						className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
					>
						<ExternalLink className="h-3 w-3" />
						Open in new tab
					</button>
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-hidden">
				{attachMode !== "none" ? (
					<AttachTerminal
						containerId={containerId}
						shell={attachShell}
						isSidecar={attachMode === "sidecar"}
						sidecarImage={sidecarImage}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
						Select a shell and click Connect to start an interactive session.
					</div>
				)}
			</div>
		</div>
	);
});

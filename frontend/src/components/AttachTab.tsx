import { memo, useState } from "react";
import { OpenInNewTab } from "@/components/common/OpenInNewTab";
import { SimpleSelect, toOptions } from "@/components/common/SimpleSelect";
import { Button } from "@/components/ui/button";
import { AttachTerminal } from "./AttachTerminal";

const SHELLS = toOptions(["/bin/sh", "/bin/bash"]);
const SIDECAR_IMAGES = toOptions(["alpine", "debian:stable-slim"]);

export const AttachTab = memo(function AttachTab({
	containerId,
	containerName,
}: {
	containerId: string;
	containerName: string;
}) {
	const [shell, setShell] = useState("/bin/sh");
	const [sidecarImage, setSidecarImage] = useState("alpine");
	const [mode, setMode] = useState<"none" | "normal" | "sidecar">("none");

	const connected = mode !== "none";

	return (
		<div className="relative flex h-full flex-col bg-terminal">
			<header className="flex items-center justify-between gap-4 border-b border-border bg-terminal-raised px-4 py-2">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						Shell:
						<SimpleSelect
							aria-label="Shell"
							value={shell}
							onValueChange={setShell}
							options={SHELLS}
							disabled={connected}
						/>
					</div>

					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						Sidecar:
						<SimpleSelect
							aria-label="Sidecar image"
							value={sidecarImage}
							onValueChange={setSidecarImage}
							options={SIDECAR_IMAGES}
							disabled={connected}
						/>
					</div>

					{connected ? (
						<Button
							size="sm"
							variant="destructive"
							onClick={() => setMode("none")}
						>
							Disconnect
						</Button>
					) : (
						<>
							<Button
								size="sm"
								onClick={() => setMode("normal")}
								className="bg-success/15 text-success hover:bg-success/25"
							>
								Connect
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setMode("sidecar")}
							>
								Connect with Sidecar
							</Button>
						</>
					)}
				</div>

				<OpenInNewTab
					params={{
						attach: containerId,
						shell,
						name: containerName,
						...(mode === "sidecar" ? { sidecar: "true", sidecarImage } : {}),
					}}
				/>
			</header>

			<div className="min-h-0 flex-1 overflow-hidden">
				{connected ? (
					<AttachTerminal
						containerId={containerId}
						shell={shell}
						isSidecar={mode === "sidecar"}
						sidecarImage={sidecarImage}
					/>
				) : (
					<p className="flex h-full items-center justify-center text-sm text-muted-foreground">
						Select a shell and click Connect to start an interactive session.
					</p>
				)}
			</div>
		</div>
	);
});

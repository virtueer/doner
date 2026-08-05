import { useEffect, useState } from "react";
import { FileBrowser } from "./FileBrowser";

export function FileBrowserScreen({
	apiPrefix,
	nodeName,
	type,
}: {
	apiPrefix: string;
	nodeName: string;
	type: "volume" | "container";
}) {
	const [mounts, setMounts] = useState<any[]>([]);

	useEffect(() => {
		if (type !== "container") return;
		const fetchMounts = async () => {
			try {
				const rawId = apiPrefix.split("/").pop() || "";
				const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
				const res = await fetch(`${apiUrl}/api/inspect/containerNode/${rawId}`);
				if (res.ok) {
					const json = await res.json();
					if (json.Mounts) setMounts(json.Mounts);
				}
			} catch (_e) {}
		};
		fetchMounts();
	}, [type, apiPrefix]);

	return (
		<div className="w-full h-screen dark text-foreground overflow-hidden flex flex-col bg-[#1e1e1e]">
			<FileBrowser
				apiPrefix={apiPrefix}
				nodeName={nodeName}
				type={type}
				mounts={mounts}
				isFullscreen={true}
			/>
		</div>
	);
}

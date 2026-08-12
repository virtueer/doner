import { useEffect, useState } from "react";
import { api } from "../lib/api";
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
				const res = await api.get(`/api/inspect/containerNode/${rawId}`);
				if (res.data?.Mounts) setMounts(res.data.Mounts);
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

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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
		const rawId = apiPrefix.split("/").pop() || "";
		api
			.get(`/api/inspect/containerNode/${rawId}`)
			.then((res) => setMounts(res.data?.Mounts ?? []))
			.catch(() => setMounts([]));
	}, [type, apiPrefix]);

	useEffect(() => {
		document.title = `${nodeName} — Files`;
	}, [nodeName]);

	return (
		<div className="h-screen overflow-hidden">
			<FileBrowser
				apiPrefix={apiPrefix}
				nodeName={nodeName}
				type={type}
				mounts={mounts}
				isFullscreen
			/>
		</div>
	);
}

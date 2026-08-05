import { useQuery } from "@tanstack/react-query";
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
	const rawId = apiPrefix.split("/").pop() || "";

	const { data: mounts = [] } = useQuery({
		queryKey: ["inspect", "containerNode", rawId],
		queryFn: async () => {
			const res = await api.get(`/api/inspect/containerNode/${rawId}`);
			return res.data?.Mounts || [];
		},
		enabled: type === "container",
	});

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

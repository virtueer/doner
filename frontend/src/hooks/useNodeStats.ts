import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useNodeStats(
	nodeType: string,
	rawId: string,
	isContainer: boolean,
) {
	const [stats, setStats] = useState<any>(null);

	useEffect(() => {
		if (!isContainer) return;
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/container-stats/${rawId}`);

		es.onmessage = (event) => {
			try {
				const parsed = JSON.parse(event.data);
				if (!parsed.error) {
					setStats(parsed);
				}
			} catch (_e) {}
		};

		return () => {
			es.close();
		};
	}, [isContainer, rawId]);

	const {
		data,
		isLoading: dataLoading,
		error: dataError,
	} = useQuery({
		queryKey: ["inspect", nodeType, rawId],
		queryFn: async () => {
			const res = await api.get(`/api/inspect/${nodeType}/${rawId}`);
			if (res.data?.error) throw new Error(res.data.error);
			return res.data;
		},
	});

	const { data: systemDf } = useQuery({
		queryKey: ["system-df"],
		queryFn: async () => {
			const res = await api.get(`/api/system/df`);
			return res.data;
		},
		enabled: nodeType === "containerNode" || nodeType === "volumeNode",
	});

	return {
		stats,
		data,
		dataLoading,
		dataError,
		systemDf,
	};
}

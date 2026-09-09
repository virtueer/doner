import { useEffect, useState } from "react";
import { API_URL, api } from "@/lib/api";

export function useNodeDetailsData(
	nodeId: string,
	nodeName: string,
	nodeType: string,
	onClose: () => void,
	onAutoReopenRequest?: (id: string, name: string, type: string) => void,
) {
	const rawId = nodeId.replace(/^(cont-|net-|vol-|img-)/, "");
	const isContainer = nodeType === "containerNode";
	const isVolume = nodeType === "volumeNode";

	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stats, setStats] = useState<any>(null);
	const [systemDf, setSystemDf] = useState<any>(null);
	const [actionLoading, setActionLoading] = useState<
		"start" | "stop" | "restart" | null
	>(null);

	useEffect(() => {
		if (!isContainer) return;
		const es = new EventSource(`${API_URL}/api/container-stats/${rawId}`);

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
	}, [rawId, isContainer]);

	const handleAction = async (action: "start" | "stop" | "restart") => {
		try {
			setActionLoading(action);
			await api.post(`/api/containers/${rawId}/${action}`);
			if (action === "restart" || action === "start") {
				if (onAutoReopenRequest) {
					onAutoReopenRequest(nodeId, nodeName, nodeType);
				}
				onClose();
			}
		} catch (err) {
			console.error(`Failed to ${action} container:`, err);
		} finally {
			setActionLoading(null);
		}
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const res = await api.get(`/api/inspect/${nodeType}/${rawId}`);
				const json = res.data;

				if (json.error) {
					throw new Error(json.error);
				}

				setData(json);

				if (nodeType === "containerNode" || nodeType === "volumeNode") {
					api
						.get("/api/system/df")
						.then((dfRes) => {
							if (dfRes.data) setSystemDf(dfRes.data);
						})
						.catch(console.error);
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [nodeType, rawId]);

	return {
		rawId,
		isContainer,
		isVolume,
		data,
		loading,
		error,
		stats,
		systemDf,
		actionLoading,
		handleAction,
	};
}

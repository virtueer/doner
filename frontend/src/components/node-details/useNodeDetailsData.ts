import { useEffect, useState } from "react";

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
	}, [rawId, isContainer]);

	const handleAction = async (action: "start" | "stop" | "restart") => {
		try {
			setActionLoading(action);
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			await fetch(`${apiUrl}/api/containers/${rawId}/${action}`, {
				method: "POST",
			});
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
				const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
				const res = await fetch(`${apiUrl}/api/inspect/${nodeType}/${rawId}`);
				if (!res.ok) throw new Error("Failed to fetch inspect data");
				const json = await res.json();

				if (json.error) {
					throw new Error(json.error);
				}

				setData(json);

				if (nodeType === "containerNode" || nodeType === "volumeNode") {
					fetch(`${apiUrl}/api/system/df`)
						.then((dfRes) => {
							if (dfRes.ok) return dfRes.json();
							return null;
						})
						.then((dfJson) => {
							if (dfJson) setSystemDf(dfJson);
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

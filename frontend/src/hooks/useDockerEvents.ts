import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

export function useDockerEvents() {
	const queryClient = useQueryClient();
	const [globalEvents, setGlobalEvents] = useState<any[]>([]);
	const pendingReopenNodeRef = useRef<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

	const [selectedNodeFromEvent, setSelectedNodeFromEvent] = useState<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/events`);
		es.onmessage = (event) => {
			try {
				const e = JSON.parse(event.data);
				const action = e.Action || e.status;
				const type = e.Type || e.type;

				const isInternal = e.Actor?.Attributes?.["doner.internal"] === "true";

				setGlobalEvents((prev) => {
					const next = [e, ...prev];
					return next.length > 200 ? next.slice(0, 200) : next;
				});

				const isRelevantAction =
					(type === "container" &&
						["start", "die", "destroy"].includes(action)) ||
					(type === "volume" && action === "destroy");

				if (!isRelevantAction) return;

				if (!isInternal) {
					const name = e.Actor?.Attributes?.name;
					if (action === "start") toast(`Container ${name} started`, "success");
					else if (action === "die")
						toast(`Container ${name} stopped`, "error");
					else if (action === "destroy")
						toast(
							`${type === "container" ? "Container" : "Volume"} ${name} removed`,
							"error",
						);
				}

				queryClient.invalidateQueries({ queryKey: ["network-graph"] });

				if (
					action === "start" &&
					type === "container" &&
					pendingReopenNodeRef.current
				) {
					const pendingId = pendingReopenNodeRef.current.id.replace(
						"cont-",
						"",
					);
					const eventId = e.id || e.Actor?.ID || "";
					if (eventId.startsWith(pendingId) || pendingId.startsWith(eventId)) {
						setSelectedNodeFromEvent(pendingReopenNodeRef.current);
						pendingReopenNodeRef.current = null;
					}
				}
			} catch (_err) {}
		};

		return () => {
			es.close();
		};
	}, [queryClient]);

	return {
		globalEvents,
		pendingReopenNodeRef,
		selectedNodeFromEvent,
		setSelectedNodeFromEvent,
	};
}

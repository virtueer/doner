import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

export function useLogStream(containerId: string, maxLines: number) {
	const [logs, setLogs] = useState<string[]>([]);
	const [autoScroll, setAutoScroll] = useState(true);
	const endRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const es = new EventSource(`${API_URL}/api/container-logs/${containerId}`);

		es.onmessage = (event) => {
			let line: string;
			try {
				const parsed = JSON.parse(event.data);
				line = typeof parsed === "string" ? parsed : String(parsed ?? "");
			} catch {
				line = event.data ?? "";
			}
			if (!line) return;
			setLogs((prev) => {
				const next = [...prev, line];
				return next.length > maxLines ? next.slice(-maxLines) : next;
			});
		};

		es.onerror = () => es.close();
		return () => es.close();
	}, [containerId, maxLines]);

	useEffect(() => {
		if (autoScroll) endRef.current?.scrollIntoView({ behavior: "auto" });
	}, [autoScroll]);

	const onScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
	}, []);

	const jumpToBottom = useCallback(() => {
		setAutoScroll(true);
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	return { logs, autoScroll, endRef, scrollRef, onScroll, jumpToBottom };
}

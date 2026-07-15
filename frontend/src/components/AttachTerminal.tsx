import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

interface AttachTerminalProps {
	containerId: string;
	shell: string;
	isSidecar?: boolean;
}

export function AttachTerminal({
	containerId,
	shell,
	isSidecar,
}: AttachTerminalProps) {
	const terminalRef = useRef<HTMLDivElement>(null);
	const termInstance = useRef<Terminal | null>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		if (!terminalRef.current) return;

		// Initialize xterm.js
		const term = new Terminal({
			cursorBlink: true,
			theme: {
				background: "#0c0c0c",
				foreground: "#4ade80",
				cursor: "#4ade80",
				selectionBackground: "rgba(74, 222, 128, 0.3)",
			},
			fontFamily:
				'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
			fontSize: 12,
		});

		const fitAddon = new FitAddon();
		term.loadAddon(fitAddon);

		term.open(terminalRef.current);
		fitAddon.fit();
		termInstance.current = term;

		// Handle resize
		const handleResize = () => {
			fitAddon.fit();
		};
		window.addEventListener("resize", handleResize);

		// Connect WebSocket
		// If backend is running on port 3000 during dev, we use that
		const apiUrl = import.meta.env.VITE_API_URL || `http://localhost:3000`;
		const wsUrl = apiUrl.replace(/^http/, "ws");

		const ws = new WebSocket(
			`${wsUrl}/api/attach?containerId=${containerId}&shell=${encodeURIComponent(shell)}${isSidecar ? "&sidecar=true" : ""}`,
		);
		wsRef.current = ws;

		ws.onopen = () => {
			term.writeln(`\x1b[32mConnected to ${containerId} via ${shell}\x1b[0m`);
		};

		ws.onmessage = (event) => {
			term.write(event.data);
		};

		ws.onclose = () => {
			term.writeln("\r\n\x1b[31mConnection closed.\x1b[0m");
			// Intentionally not calling onDisconnect() here so the terminal output remains visible on error or close.
		};

		ws.onerror = (error) => {
			term.writeln(`\r\n\x1b[31mWebSocket error: ${error}\x1b[0m`);
		};

		// Handle input
		term.onData((data: string) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		});

		return () => {
			window.removeEventListener("resize", handleResize);
			if (ws.readyState === WebSocket.OPEN) {
				ws.close();
			}
			term.dispose();
		};
	}, [containerId, shell, isSidecar]);

	return <div ref={terminalRef} className="w-full h-full overflow-hidden" />;
}

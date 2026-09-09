import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { WS_URL } from "@/lib/api";
import "@xterm/xterm/css/xterm.css";

const THEME = {
	background: "#101014",
	foreground: "#d4d4d8",
	cursor: "#4ade80",
	selectionBackground: "rgba(74, 222, 128, 0.3)",
};

const FONT_FAMILY =
	'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function AttachTerminal({
	containerId,
	shell,
	isSidecar,
	sidecarImage = "alpine",
}: {
	containerId: string;
	shell: string;
	isSidecar?: boolean;
	sidecarImage?: string;
}) {
	const terminalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!terminalRef.current) return;

		const term = new Terminal({
			cursorBlink: true,
			theme: THEME,
			fontFamily: FONT_FAMILY,
			fontSize: 12,
		});
		const fitAddon = new FitAddon();
		term.loadAddon(fitAddon);
		term.open(terminalRef.current);
		fitAddon.fit();

		const handleResize = () => fitAddon.fit();
		window.addEventListener("resize", handleResize);

		const sidecarParams = isSidecar
			? `&sidecar=true&sidecarImage=${encodeURIComponent(sidecarImage)}`
			: "";
		const ws = new WebSocket(
			`${WS_URL}/api/attach?containerId=${containerId}&shell=${encodeURIComponent(shell)}${sidecarParams}`,
		);

		ws.onopen = () =>
			term.writeln(
				isSidecar
					? `\x1b[32mConnected to ${containerId} via sidecar (${sidecarImage})\x1b[0m`
					: `\x1b[32mConnected to ${containerId} via ${shell}\x1b[0m`,
			);
		ws.onmessage = (event) => term.write(event.data);
		ws.onclose = () => term.writeln("\r\n\x1b[31mConnection closed.\x1b[0m");
		ws.onerror = (error) =>
			term.writeln(`\r\n\x1b[31mWebSocket error: ${error}\x1b[0m`);

		term.onData((data) => {
			if (ws.readyState === WebSocket.OPEN) ws.send(data);
		});

		return () => {
			window.removeEventListener("resize", handleResize);
			if (ws.readyState === WebSocket.OPEN) ws.close();
			term.dispose();
		};
	}, [containerId, shell, isSidecar, sidecarImage]);

	return <div ref={terminalRef} className="h-full w-full overflow-hidden" />;
}

import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AttachScreen } from "./components/AttachScreen";
import { FileBrowserScreen } from "./components/FileBrowserScreen";
import { Flow } from "./components/Flow";
import { LogsTerminal } from "./components/LogsTerminal";
import { Toaster } from "./components/ui/Toaster";

function App() {
	// Check for terminal mode via URL params
	const params = new URLSearchParams(window.location.search);
	const logsParam = params.get("logs");
	const nameParam = params.get("name");
	const attachParam = params.get("attach");
	const shellParam = params.get("shell") || "/bin/sh";
	const sidecarParam = params.get("sidecar") === "true";
	const isTerminalMode = !!logsParam;
	const isAttachMode = !!attachParam;

	const filesParam = params.get("files");
	const apiPrefixParam = params.get("apiPrefix");
	const typeParam = params.get("type") as "volume" | "container";

	if (isTerminalMode && logsParam && nameParam) {
		return <LogsTerminal containerId={logsParam} containerName={nameParam} />;
	}

	if (isAttachMode && attachParam && nameParam) {
		return (
			<AttachScreen
				containerId={attachParam}
				containerName={nameParam}
				shell={shellParam}
				isSidecar={sidecarParam}
			/>
		);
	}

	if (filesParam === "true" && apiPrefixParam && nameParam && typeParam) {
		return (
			<FileBrowserScreen
				apiPrefix={apiPrefixParam}
				nodeName={nameParam}
				type={typeParam}
			/>
		);
	}

	return (
		<div className="w-full h-screen dark bg-background text-foreground">
			<ReactFlowProvider>
				<Flow />
			</ReactFlowProvider>
			<Toaster />
		</div>
	);
}

export default App;

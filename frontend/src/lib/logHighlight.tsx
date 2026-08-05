import type { ReactNode } from "react";
import { renderJsonHighlight } from "./logHighlight/json";
import { renderLogfmtHighlight } from "./logHighlight/logfmt";
import { renderPlainHighlight } from "./logHighlight/plain";
import { detectFormat, stripAnsi } from "./logHighlight/utils";

export type { LogFormat } from "./logHighlight/utils";
// Re-export utilities so other files don't break
export {
	detectFormat,
	detectLogLevel,
	getLogLevelColor,
	stripAnsi,
} from "./logHighlight/utils";
export { renderJsonHighlight, renderLogfmtHighlight, renderPlainHighlight };

// --- Main Entry Point ---

export function highlightLog(text: string): ReactNode {
	const clean = stripAnsi(text);
	const format = detectFormat(clean);

	switch (format) {
		case "json":
			return <>{renderJsonHighlight(clean)}</>;
		case "logfmt":
			return <>{renderLogfmtHighlight(clean)}</>;
		case "plain":
			return <>{renderPlainHighlight(clean)}</>;
	}
}

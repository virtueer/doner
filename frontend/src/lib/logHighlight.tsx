import type { ReactNode } from "react";
import { renderJsonHighlight } from "./logHighlight/json";
import { renderLogfmtHighlight } from "./logHighlight/logfmt";
import { renderPlainHighlight } from "./logHighlight/plain";
import { detectFormat, stripAnsi } from "./logHighlight/utils";

export { detectLogLevel } from "./logHighlight/utils";
export { renderJsonHighlight };

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

import type { ReactNode } from "react";
import {
	detectFormat,
	detectLogLevel,
	type LogFormat,
	stripAnsi,
} from "./log-highlight/logRules";
import { renderJsonHighlight } from "./log-highlight/renderJsonHighlight";
import { renderLogfmtHighlight } from "./log-highlight/renderLogfmtHighlight";
import { renderPlainHighlight } from "./log-highlight/renderPlainHighlight";

export type { LogFormat };
export { detectFormat, detectLogLevel, renderJsonHighlight, stripAnsi };

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

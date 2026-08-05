import type { ReactNode } from "react";
import { getLogLevelColor } from "./utils";

export function renderJsonHighlight(text: string): ReactNode[] {
	const elements: ReactNode[] = [];
	// Combined tokenizer: key+colon, string value, number, boolean, null, structural
	const tokenRegex =
		/("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],])/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let idx = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = tokenRegex.exec(text)) !== null) {
		// Gap text before this token
		if (match.index > lastIndex) {
			elements.push(
				<span key={`g${idx++}`} style={{ color: "rgba(255,255,255,0.4)" }}>
					{text.slice(lastIndex, match.index)}
				</span>,
			);
		}

		if (match[1] && match[2]) {
			// JSON key + colon (group 2 includes any whitespace before colon)
			elements.push(
				<span key={`k${idx++}`} style={{ color: "#7dd3fc" }}>
					{match[1]}
				</span>,
			);
			elements.push(
				<span key={`c${idx++}`} style={{ color: "rgba(255,255,255,0.25)" }}>
					{match[2]}
				</span>,
			);
		} else if (match[3]) {
			// String value — check if it's a log level keyword
			const inner = match[3].slice(1, -1);
			const levelColor = getLogLevelColor(inner);
			if (levelColor) {
				elements.push(
					<span
						key={`lv${idx++}`}
						style={{ color: levelColor, fontWeight: 600 }}
					>
						{match[3]}
					</span>,
				);
			} else {
				elements.push(
					<span key={`s${idx++}`} style={{ color: "#fbbf24" }}>
						{match[3]}
					</span>,
				);
			}
		} else if (match[4]) {
			// Number
			elements.push(
				<span key={`n${idx++}`} style={{ color: "#c084fc" }}>
					{match[4]}
				</span>,
			);
		} else if (match[5]) {
			// Boolean
			elements.push(
				<span key={`b${idx++}`} style={{ color: "#fb923c" }}>
					{match[5]}
				</span>,
			);
		} else if (match[6]) {
			// Null
			elements.push(
				<span key={`nl${idx++}`} style={{ color: "rgba(255,255,255,0.25)" }}>
					{match[6]}
				</span>,
			);
		} else if (match[7]) {
			// Structural: {} [] ,
			elements.push(
				<span key={`p${idx++}`} style={{ color: "rgba(255,255,255,0.3)" }}>
					{match[7]}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	// Remaining text
	if (lastIndex < text.length) {
		elements.push(
			<span key={`r${idx++}`} style={{ color: "rgba(255,255,255,0.4)" }}>
				{text.slice(lastIndex)}
			</span>,
		);
	}

	return elements;
}

import type { ReactNode } from "react";
import { getLogLevelColor } from "./utils";

export function renderLogfmtHighlight(text: string): ReactNode[] {
	const elements: ReactNode[] = [];
	const kvRegex = /([\w.-]+)(=)("(?:[^"\\]|\\.)*"|[^\s]*)/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let idx = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = kvRegex.exec(text)) !== null) {
		// Gap before this k=v pair (spaces, other text)
		if (match.index > lastIndex) {
			elements.push(
				<span key={`g${idx++}`} style={{ color: "rgba(255,255,255,0.5)" }}>
					{text.slice(lastIndex, match.index)}
				</span>,
			);
		}

		const key = match[1];
		const eq = match[2];
		const value = match[3];

		// Key
		elements.push(
			<span key={`k${idx++}`} style={{ color: "#7dd3fc" }}>
				{key}
			</span>,
		);
		// Equals sign
		elements.push(
			<span key={`eq${idx++}`} style={{ color: "rgba(255,255,255,0.25)" }}>
				{eq}
			</span>,
		);

		// Value — contextual coloring
		const cleanValue = value.replace(/^"|"$/g, "");
		const levelColor = getLogLevelColor(cleanValue);

		if (levelColor) {
			// Log level value
			elements.push(
				<span key={`v${idx++}`} style={{ color: levelColor, fontWeight: 600 }}>
					{value}
				</span>,
			);
		} else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
			// Number
			elements.push(
				<span key={`v${idx++}`} style={{ color: "#c084fc" }}>
					{value}
				</span>,
			);
		} else if (value === "true" || value === "false") {
			// Boolean
			elements.push(
				<span key={`v${idx++}`} style={{ color: "#fb923c" }}>
					{value}
				</span>,
			);
		} else if (value === "null" || value === "nil") {
			// Null
			elements.push(
				<span key={`v${idx++}`} style={{ color: "rgba(255,255,255,0.25)" }}>
					{value}
				</span>,
			);
		} else if (value.startsWith('"')) {
			// Quoted string
			elements.push(
				<span key={`v${idx++}`} style={{ color: "#fbbf24" }}>
					{value}
				</span>,
			);
		} else {
			// Plain unquoted value
			elements.push(
				<span key={`v${idx++}`} style={{ color: "#d1d5db" }}>
					{value}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	// Remaining text
	if (lastIndex < text.length) {
		elements.push(
			<span key={`r${idx++}`} style={{ color: "rgba(255,255,255,0.5)" }}>
				{text.slice(lastIndex)}
			</span>,
		);
	}

	return elements;
}

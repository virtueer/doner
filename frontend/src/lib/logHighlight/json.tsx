import type { ReactNode } from "react";
import { getLogLevelColor } from "./utils";

export function renderJsonHighlight(text: string): ReactNode[] {
	const elements: ReactNode[] = [];
	const tokenRegex =
		/("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],])/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let idx = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
	while ((match = tokenRegex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			elements.push(
				<span key={`g${idx++}`} style={{ color: "rgba(255,255,255,0.4)" }}>
					{text.slice(lastIndex, match.index)}
				</span>,
			);
		}

		if (match[1] && match[2]) {
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
			elements.push(
				<span key={`n${idx++}`} style={{ color: "#c084fc" }}>
					{match[4]}
				</span>,
			);
		} else if (match[5]) {
			elements.push(
				<span key={`b${idx++}`} style={{ color: "#fb923c" }}>
					{match[5]}
				</span>,
			);
		} else if (match[6]) {
			elements.push(
				<span key={`nl${idx++}`} style={{ color: "rgba(255,255,255,0.25)" }}>
					{match[6]}
				</span>,
			);
		} else if (match[7]) {
			elements.push(
				<span key={`p${idx++}`} style={{ color: "rgba(255,255,255,0.3)" }}>
					{match[7]}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		elements.push(
			<span key={`r${idx++}`} style={{ color: "rgba(255,255,255,0.4)" }}>
				{text.slice(lastIndex)}
			</span>,
		);
	}

	return elements;
}

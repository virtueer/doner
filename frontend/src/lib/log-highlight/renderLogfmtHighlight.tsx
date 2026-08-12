import type { ReactNode } from "react";
import { getLogLevelColor } from "./logRules";

export function renderLogfmtHighlight(text: string): ReactNode[] {
	const elements: ReactNode[] = [];
	const kvRegex = /([\w.-]+)(=)("(?:[^"\\]|\\.)*"|[^\s]*)/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let idx = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = kvRegex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			elements.push(
				<span key={`g${idx++}`} className="text-white/50">
					{text.slice(lastIndex, match.index)}
				</span>,
			);
		}

		const key = match[1];
		const eq = match[2];
		const value = match[3];

		elements.push(
			<span key={`k${idx++}`} className="text-sky-300">
				{key}
			</span>,
		);
		elements.push(
			<span key={`eq${idx++}`} className="text-white/25">
				{eq}
			</span>,
		);

		const cleanValue = value.replace(/^"|"$/g, "");
		const levelColor = getLogLevelColor(cleanValue);

		if (levelColor) {
			elements.push(
				<span
					key={`v${idx++}`}
					className="font-semibold"
					style={{ color: levelColor }}
				>
					{value}
				</span>,
			);
		} else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
			elements.push(
				<span key={`v${idx++}`} className="text-purple-400">
					{value}
				</span>,
			);
		} else if (value === "true" || value === "false") {
			elements.push(
				<span key={`v${idx++}`} className="text-orange-400">
					{value}
				</span>,
			);
		} else if (value === "null" || value === "nil") {
			elements.push(
				<span key={`v${idx++}`} className="text-white/25">
					{value}
				</span>,
			);
		} else if (value.startsWith('"')) {
			elements.push(
				<span key={`v${idx++}`} className="text-amber-400">
					{value}
				</span>,
			);
		} else {
			elements.push(
				<span key={`v${idx++}`} className="text-gray-300">
					{value}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		elements.push(
			<span key={`r${idx++}`} className="text-white/50">
				{text.slice(lastIndex)}
			</span>,
		);
	}

	return elements;
}

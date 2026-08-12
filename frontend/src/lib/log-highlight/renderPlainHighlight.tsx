import type { ReactNode } from "react";
import { getLogLevelColor } from "./logRules";

export function renderPlainHighlight(text: string): ReactNode[] {
	const elements: ReactNode[] = [];
	const plainRegex =
		/(\[(?:ERROR|ERR|FATAL|PANIC|WARN|WARNING|INFO|DEBUG|TRACE)\]|\b(?:ERROR|ERR|FATAL|PANIC|WARN|WARNING|INFO|DEBUG|TRACE)\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(https?:\/\/\S+)|(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b)|(\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b)|(\b\d+(?:\.\d+)?(?:ms|µs|us|ns|s|sec|min)\b)/gi;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let idx = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = plainRegex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			elements.push(
				<span key={`g${idx++}`} className="text-gray-300">
					{text.slice(lastIndex, match.index)}
				</span>,
			);
		}

		if (match[1]) {
			const clean = match[1].replace(/[[\]]/g, "");
			const color = getLogLevelColor(clean) || "#d1d5db";
			elements.push(
				<span key={`l${idx++}`} className="font-semibold" style={{ color }}>
					{match[1]}
				</span>,
			);
		} else if (match[2]) {
			elements.push(
				<span key={`s${idx++}`} className="text-amber-400">
					{match[2]}
				</span>,
			);
		} else if (match[3]) {
			elements.push(
				<span
					key={`u${idx++}`}
					className="text-blue-400 underline decoration-blue-400/30"
				>
					{match[3]}
				</span>,
			);
		} else if (match[4]) {
			elements.push(
				<span key={`ip${idx++}`} className="text-purple-400">
					{match[4]}
				</span>,
			);
		} else if (match[5]) {
			elements.push(
				<span key={`m${idx++}`} className="text-emerald-400 font-semibold">
					{match[5]}
				</span>,
			);
		} else if (match[6]) {
			elements.push(
				<span key={`d${idx++}`} className="text-purple-400">
					{match[6]}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		elements.push(
			<span key={`r${idx++}`} className="text-gray-300">
				{text.slice(lastIndex)}
			</span>,
		);
	}

	return elements.length > 0
		? elements
		: [
				<span key="all" className="text-gray-300">
					{text}
				</span>,
			];
}

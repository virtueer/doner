import type { ReactNode } from "react";
import { getLogLevelColor } from "./utils";

export function renderPlainHighlight(text: string): ReactNode[] {
	const elements: ReactNode[] = [];
	// Match: log levels, quoted strings, URLs, IP addresses, HTTP methods, durations
	const plainRegex =
		/(\[(?:ERROR|ERR|FATAL|PANIC|WARN|WARNING|INFO|DEBUG|TRACE)\]|\b(?:ERROR|ERR|FATAL|PANIC|WARN|WARNING|INFO|DEBUG|TRACE)\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(https?:\/\/\S+)|(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b)|(\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b)|(\b\d+(?:\.\d+)?(?:ms|µs|us|ns|s|sec|min)\b)/gi;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let idx = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = plainRegex.exec(text)) !== null) {
		// Gap text
		if (match.index > lastIndex) {
			elements.push(
				<span key={`g${idx++}`} style={{ color: "#d1d5db" }}>
					{text.slice(lastIndex, match.index)}
				</span>,
			);
		}

		if (match[1]) {
			// Log level
			const clean = match[1].replace(/[[\]]/g, "");
			const color = getLogLevelColor(clean) || "#d1d5db";
			elements.push(
				<span key={`l${idx++}`} style={{ color, fontWeight: 600 }}>
					{match[1]}
				</span>,
			);
		} else if (match[2]) {
			// Quoted string
			elements.push(
				<span key={`s${idx++}`} style={{ color: "#fbbf24" }}>
					{match[2]}
				</span>,
			);
		} else if (match[3]) {
			// URL
			elements.push(
				<span
					key={`u${idx++}`}
					style={{
						color: "#60a5fa",
						textDecoration: "underline",
						textDecorationColor: "rgba(96,165,250,0.3)",
					}}
				>
					{match[3]}
				</span>,
			);
		} else if (match[4]) {
			// IP address
			elements.push(
				<span key={`ip${idx++}`} style={{ color: "#a78bfa" }}>
					{match[4]}
				</span>,
			);
		} else if (match[5]) {
			// HTTP method
			elements.push(
				<span key={`m${idx++}`} style={{ color: "#34d399", fontWeight: 600 }}>
					{match[5]}
				</span>,
			);
		} else if (match[6]) {
			// Duration with unit
			elements.push(
				<span key={`d${idx++}`} style={{ color: "#c084fc" }}>
					{match[6]}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	// Remaining text
	if (lastIndex < text.length) {
		elements.push(
			<span key={`r${idx++}`} style={{ color: "#d1d5db" }}>
				{text.slice(lastIndex)}
			</span>,
		);
	}

	return elements.length > 0
		? elements
		: [
				<span key="all" style={{ color: "#d1d5db" }}>
					{text}
				</span>,
			];
}

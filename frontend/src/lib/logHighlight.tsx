import type { ReactNode } from "react";

export type LogFormat = "json" | "logfmt" | "plain";

// biome-ignore lint/suspicious/noControlCharactersInRegex: need to match ANSI escape sequences
const ANSI_REGEX = /\x1b\[(\d+(?:;\d+)*)?m/g;

export function stripAnsi(text: string): string {
	return text.replace(ANSI_REGEX, "");
}

export function detectFormat(text: string): LogFormat {
	const clean = stripAnsi(text).trim();

	// JSON: starts with { and ends with }
	if (clean.startsWith("{") && clean.endsWith("}")) {
		try {
			JSON.parse(clean);
			return "json";
		} catch {
			// fall through
		}
	}

	// Logfmt: at least 2 key=value patterns
	const kvMatches = clean.match(/(?:^|\s)[\w.-]+=(?:"(?:[^"\\]|\\.)*"|\S+)/g);
	if (kvMatches && kvMatches.length >= 2) {
		return "logfmt";
	}

	return "plain";
}

// --- Log Level Colors ---

const LOG_LEVEL_COLORS: Record<string, string> = {
	error: "#f87171",
	err: "#f87171",
	fatal: "#f87171",
	panic: "#f87171",
	warn: "#fbbf24",
	warning: "#fbbf24",
	info: "#60a5fa",
	debug: "#9ca3af",
	trace: "#6b7280",
};

function getLogLevelColor(value: string): string | null {
	return LOG_LEVEL_COLORS[value.toLowerCase()] || null;
}

/**
 * Detect log level for line-level styling (subtle background tint).
 * Only returns non-null for error/warning levels to avoid noise.
 */
export function detectLogLevel(
	text: string,
): { color: string; bg: string } | null {
	const clean = stripAnsi(text);

	// Error patterns across formats
	if (
		/"level"\s*:\s*"(?:error|err|fatal|panic)"/i.test(clean) ||
		/\blevel=(?:error|err|fatal|panic)\b/i.test(clean) ||
		/\[(?:ERROR|ERR|FATAL|PANIC)\]/i.test(clean)
	) {
		return { color: "#f87171", bg: "rgba(239, 68, 68, 0.06)" };
	}

	// Warning patterns
	if (
		/"level"\s*:\s*"(?:warn|warning)"/i.test(clean) ||
		/\blevel=(?:warn|warning)\b/i.test(clean) ||
		/\[(?:WARN|WARNING)\]/i.test(clean)
	) {
		return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.04)" };
	}

	return null;
}

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

// --- JSON Highlighting ---

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

// --- Logfmt / key=value Highlighting ---

function renderLogfmtHighlight(text: string): ReactNode[] {
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

// --- Plain Text Highlighting ---

function renderPlainHighlight(text: string): ReactNode[] {
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

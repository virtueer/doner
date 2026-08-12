export type LogFormat = "json" | "logfmt" | "plain";

// biome-ignore lint/suspicious/noControlCharactersInRegex: match ANSI escape sequences
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

export function getLogLevelColor(value: string): string | null {
	return LOG_LEVEL_COLORS[value.toLowerCase()] || null;
}

export function detectLogLevel(
	text: string,
): { color: string; bg: string } | null {
	const clean = stripAnsi(text);

	if (
		/"level"\s*:\s*"(?:error|err|fatal|panic)"/i.test(clean) ||
		/\blevel=(?:error|err|fatal|panic)\b/i.test(clean) ||
		/\[(?:ERROR|ERR|FATAL|PANIC)\]/i.test(clean)
	) {
		return { color: "#f87171", bg: "rgba(239, 68, 68, 0.06)" };
	}

	if (
		/"level"\s*:\s*"(?:warn|warning)"/i.test(clean) ||
		/\blevel=(?:warn|warning)\b/i.test(clean) ||
		/\[(?:WARN|WARNING)\]/i.test(clean)
	) {
		return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.04)" };
	}

	return null;
}

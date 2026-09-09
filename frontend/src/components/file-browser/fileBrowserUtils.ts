const LANGUAGE_BY_EXTENSION: Record<string, string> = {
	js: "javascript",
	jsx: "javascript",
	ts: "typescript",
	tsx: "typescript",
	json: "json",
	html: "html",
	css: "css",
	md: "markdown",
	yaml: "yaml",
	yml: "yaml",
	sh: "shell",
	bash: "shell",
	py: "python",
	go: "go",
	rs: "rust",
	c: "c",
	cpp: "cpp",
	java: "java",
};

export const SUPPORTED_LANGUAGES = [
	...new Set(Object.values(LANGUAGE_BY_EXTENSION)),
	"plaintext",
];

export const getLanguageFromExtension = (filename: string) =>
	LANGUAGE_BY_EXTENSION[filename.split(".").pop()?.toLowerCase() || ""] ||
	"plaintext";

export const joinPath = (dir: string, name: string) =>
	dir === "/" ? name : `${dir.replace(/\/$/, "")}/${name}`;

export interface ClipboardItem {
	apiPrefix: string;
	path: string;
	name: string;
	type: "file" | "directory";
}

let globalClipboard: ClipboardItem | null = null;

export const getGlobalClipboard = () => globalClipboard;
export const setGlobalClipboard = (item: ClipboardItem | null) => {
	globalClipboard = item;
};

export const getUniqueName = (name: string, files: any[]) => {
	const dot = name.lastIndexOf(".");
	const base = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : "";

	let candidate = name;
	let counter = 1;
	while (files.some((f) => f.name === candidate)) {
		candidate = `${base}-${counter}${ext}`;
		counter++;
	}
	return candidate;
};

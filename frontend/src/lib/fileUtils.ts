export const getLanguageFromExtension = (filename: string) => {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	const map: Record<string, string> = {
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
	return map[ext] || "plaintext";
};

export type ClipboardItem = {
	apiPrefix: string;
	path: string;
	name: string;
	type: "file" | "directory";
};

export const globalClipboard: { current: ClipboardItem | null } = {
	current: null,
};

export const getUniqueName = (name: string, fileList: any[]) => {
	let newName = name;
	let counter = 1;
	const nameWithoutExt = name.includes(".")
		? name.substring(0, name.lastIndexOf("."))
		: name;
	const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")) : "";

	while (fileList.some((f) => f.name === newName)) {
		newName = `${nameWithoutExt}-${counter}${ext}`;
		counter++;
	}
	return newName;
};

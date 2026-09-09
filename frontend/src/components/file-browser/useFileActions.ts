import { useState } from "react";
import { api } from "@/lib/api";
import {
	type ClipboardItem,
	getGlobalClipboard,
	getUniqueName,
	joinPath,
	setGlobalClipboard,
} from "./fileBrowserUtils";

export function useFileActions(
	apiPrefix: string,
	currentPath: string,
	files: any[],
	fetchFiles: (path: string) => void,
	showAlert: (title: string, message: string) => Promise<void>,
	showConfirm: (title: string, message: string) => Promise<boolean>,
	showPrompt: (
		title: string,
		message: string,
		defaultValue?: string,
	) => Promise<string | null>,
) {
	const [copiedFile, setCopiedFile] = useState<ClipboardItem | null>(null);

	const run = async (label: string, action: () => Promise<unknown>) => {
		try {
			await action();
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `${label} failed: ${err.message}`);
		}
	};

	const handleCopy = (file: any) => {
		const item: ClipboardItem = {
			apiPrefix,
			path: file.path,
			name: file.name,
			type: file.type,
		};
		setGlobalClipboard(item);
		setCopiedFile(item);
	};

	const handlePaste = async () => {
		const clipboard = getGlobalClipboard();
		if (!clipboard) return;
		if (clipboard.apiPrefix !== apiPrefix) {
			await showAlert(
				"Unsupported",
				"Cross-node copy/paste is not supported yet.",
			);
			return;
		}

		const name = files.some((f) => f.name === clipboard.name)
			? getUniqueName(clipboard.name, files)
			: clipboard.name;

		await run("Paste", () =>
			api.post(`${apiPrefix}/files/copy`, {
				srcPath: clipboard.path,
				destPath: joinPath(currentPath, name),
			}),
		);
	};

	const handleMkdir = async () => {
		const name = await showPrompt("New Folder", "New folder name:");
		if (!name) return;
		await run("Create folder", () =>
			api.post(`${apiPrefix}/files/mkdir`, null, {
				params: { path: joinPath(currentPath, name) },
			}),
		);
	};

	const handleNewFile = async () => {
		const name = await showPrompt("New File", "New file name:");
		if (!name) return;
		await run("Create file", () =>
			api.post(
				`${apiPrefix}/files/write`,
				{ content: "" },
				{ params: { path: joinPath(currentPath, name) } },
			),
		);
	};

	const handleRename = async (file: any) => {
		const newName = await showPrompt("Rename", "Enter new name:", file.name);
		if (!newName || newName === file.name) return;
		await run("Rename", () =>
			api.post(`${apiPrefix}/files/rename`, {
				srcPath: file.path,
				destPath: joinPath(currentPath, newName),
			}),
		);
	};

	const handleDelete = async (file: any) => {
		const confirmed = await showConfirm(
			"Delete File",
			`Are you sure you want to delete ${file.name}?`,
		);
		if (!confirmed) return;
		await run("Delete", () =>
			api.post(`${apiPrefix}/files/delete`, null, {
				params: { path: file.path },
			}),
		);
	};

	return {
		copiedFile,
		setCopiedFile,
		handleCopy,
		handlePaste,
		handleMkdir,
		handleNewFile,
		handleRename,
		handleDelete,
	};
}

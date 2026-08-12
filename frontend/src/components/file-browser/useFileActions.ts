import { useState } from "react";
import { api } from "../../lib/api";
import {
	type ClipboardItem,
	getGlobalClipboard,
	getUniqueName,
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

	const handleCopy = (file: any) => {
		const clipboardData: ClipboardItem = {
			apiPrefix,
			path: file.path,
			name: file.name,
			type: file.type,
		};
		setGlobalClipboard(clipboardData);
		setCopiedFile(clipboardData);
	};

	const handlePaste = async () => {
		const globalClipboard = getGlobalClipboard();
		if (!globalClipboard) return;
		if (globalClipboard.apiPrefix !== apiPrefix) {
			await showAlert(
				"Unsupported",
				"Cross-node copy/paste is not supported yet.",
			);
			return;
		}

		try {
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;

			const pasteName = files.some((f) => f.name === globalClipboard?.name)
				? getUniqueName(globalClipboard?.name, files)
				: globalClipboard?.name;

			const destPath =
				currentPath === "/" ? pasteName : safeCurrentPath + pasteName;

			await api.post(`${apiPrefix}/files/copy`, {
				srcPath: globalClipboard.path,
				destPath,
			});
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Paste failed: ${err.message}`);
		}
	};

	const handleMkdir = async () => {
		const name = await showPrompt("New Folder", "New folder name:");
		if (!name) return;
		try {
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;
			const destPath = currentPath === "/" ? name : safeCurrentPath + name;
			await api.post(`${apiPrefix}/files/mkdir`, null, {
				params: { path: destPath },
			});
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Create folder failed: ${err.message}`);
		}
	};

	const handleNewFile = async () => {
		const name = await showPrompt("New File", "New file name:");
		if (!name) return;
		try {
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;
			const destPath = currentPath === "/" ? name : safeCurrentPath + name;
			await api.post(
				`${apiPrefix}/files/write`,
				{ content: "" },
				{
					params: { path: destPath },
				},
			);
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Create file failed: ${err.message}`);
		}
	};

	const handleRename = async (file: any) => {
		const newName = await showPrompt("Rename", "Enter new name:", file.name);
		if (!newName || newName === file.name) return;
		try {
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;
			const destPath =
				currentPath === "/" ? newName : safeCurrentPath + newName;
			await api.post(`${apiPrefix}/files/rename`, {
				srcPath: file.path,
				destPath,
			});
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Rename failed: ${err.message}`);
		}
	};

	const handleDelete = async (file: any) => {
		if (
			!(await showConfirm(
				"Delete File",
				`Are you sure you want to delete ${file.name}?`,
			))
		)
			return;
		try {
			await api.post(`${apiPrefix}/files/delete`, null, {
				params: { path: file.path },
			});
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Delete failed: ${err.message}`);
		}
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

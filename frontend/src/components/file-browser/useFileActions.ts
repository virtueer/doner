import { useState } from "react";
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
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;

			const pasteName = files.some((f) => f.name === globalClipboard?.name)
				? getUniqueName(globalClipboard?.name, files)
				: globalClipboard?.name;

			const destPath =
				currentPath === "/" ? pasteName : safeCurrentPath + pasteName;

			const res = await fetch(`${apiUrl}${apiPrefix}/files/copy`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ srcPath: globalClipboard.path, destPath }),
			});
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				throw new Error(errJson.message || "Failed to copy file");
			}
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Paste failed: ${err.message}`);
		}
	};

	const handleMkdir = async () => {
		const name = await showPrompt("New Folder", "New folder name:");
		if (!name) return;
		try {
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;
			const destPath = currentPath === "/" ? name : safeCurrentPath + name;
			const res = await fetch(
				`${apiUrl}${apiPrefix}/files/mkdir?path=${encodeURIComponent(destPath)}`,
				{ method: "POST" },
			);
			if (!res.ok) throw new Error("Failed to create directory");
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Create folder failed: ${err.message}`);
		}
	};

	const handleNewFile = async () => {
		const name = await showPrompt("New File", "New file name:");
		if (!name) return;
		try {
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;
			const destPath = currentPath === "/" ? name : safeCurrentPath + name;
			const res = await fetch(
				`${apiUrl}${apiPrefix}/files/write?path=${encodeURIComponent(destPath)}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "" }),
				},
			);
			if (!res.ok) throw new Error("Failed to create file");
			fetchFiles(currentPath);
		} catch (err: any) {
			await showAlert("Error", `Create file failed: ${err.message}`);
		}
	};

	const handleRename = async (file: any) => {
		const newName = await showPrompt("Rename", "Enter new name:", file.name);
		if (!newName || newName === file.name) return;
		try {
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const safeCurrentPath = currentPath.endsWith("/")
				? currentPath
				: `${currentPath}/`;
			const destPath =
				currentPath === "/" ? newName : safeCurrentPath + newName;
			const res = await fetch(`${apiUrl}${apiPrefix}/files/rename`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ srcPath: file.path, destPath }),
			});
			if (!res.ok) throw new Error("Failed to rename file");
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
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const res = await fetch(
				`${apiUrl}${apiPrefix}/files/delete?path=${encodeURIComponent(file.path)}`,
				{ method: "POST" },
			);
			if (!res.ok) throw new Error("Failed to delete file");
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

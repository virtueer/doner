import { useCallback, useEffect, useState } from "react";
import type { DialogState } from "./FileActionDialogs";
import { useFileActions } from "./useFileActions";
import { useFileViewer } from "./useFileViewer";

export function useFileOperations(
	apiPrefix: string,
	onUnsavedChangesChange?: (hasUnsaved: boolean) => void,
) {
	const [currentPath, setCurrentPath] = useState("/");
	const [searchQuery, setSearchQuery] = useState("");
	const [files, setFiles] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dialog, setDialog] = useState<DialogState | null>(null);
	const [pathInput, setPathInput] = useState("");

	const showAlert = (title: string, message: string) => {
		return new Promise<void>((resolve) => {
			setDialog({
				isOpen: true,
				type: "alert",
				title,
				message,
				onConfirm: () => {
					setDialog(null);
					resolve();
				},
				onCancel: () => {
					setDialog(null);
					resolve();
				},
			});
		});
	};

	const showConfirm = (title: string, message: string) => {
		return new Promise<boolean>((resolve) => {
			setDialog({
				isOpen: true,
				type: "confirm",
				title,
				message,
				onConfirm: () => {
					setDialog(null);
					resolve(true);
				},
				onCancel: () => {
					setDialog(null);
					resolve(false);
				},
			});
		});
	};

	const showPrompt = (title: string, message: string, defaultValue = "") => {
		return new Promise<string | null>((resolve) => {
			setDialog({
				isOpen: true,
				type: "prompt",
				title,
				message,
				defaultValue,
				onConfirm: (val) => {
					setDialog(null);
					resolve(val || null);
				},
				onCancel: () => {
					setDialog(null);
					resolve(null);
				},
			});
		});
	};

	const {
		viewFile,
		setViewFile,
		fileLoading,
		isEditing,
		setIsEditing,
		editContent,
		setEditContent,
		fileContent,
		saving,
		selectedLanguage,
		setSelectedLanguage,
		handleFileClick,
		handleSave,
		handleCloseFileView,
	} = useFileViewer(apiPrefix, showAlert, showConfirm, onUnsavedChangesChange);

	const fetchFiles = useCallback(
		async (path: string) => {
			try {
				setLoading(true);
				setError(null);
				setViewFile(null);
				const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
				const res = await fetch(
					`${apiUrl}${apiPrefix}/files?path=${encodeURIComponent(path)}`,
				);
				if (!res.ok) throw new Error("Failed to fetch files");
				const data = await res.json();
				setFiles(data);
				setCurrentPath(path);
				setPathInput(path.startsWith("/") ? path : `/${path}`);
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		},
		[apiPrefix, setViewFile],
	);

	useEffect(() => {
		fetchFiles("/");
	}, [fetchFiles]);

	const {
		copiedFile,
		setCopiedFile,
		handleCopy,
		handlePaste,
		handleMkdir,
		handleNewFile,
		handleRename,
		handleDelete,
	} = useFileActions(
		apiPrefix,
		currentPath,
		files,
		fetchFiles,
		showAlert,
		showConfirm,
		showPrompt,
	);

	const handleBack = () => {
		if (currentPath === "/") return;
		const parts = currentPath.replace(/\/$/, "").split("/");
		parts.pop();
		fetchFiles(parts.length > 0 ? parts.join("/") : "/");
	};

	return {
		currentPath,
		pathInput,
		setPathInput,
		searchQuery,
		setSearchQuery,
		files,
		loading,
		error,
		viewFile,
		fileLoading,
		isEditing,
		setIsEditing,
		editContent,
		setEditContent,
		fileContent,
		saving,
		selectedLanguage,
		setSelectedLanguage,
		copiedFile,
		setCopiedFile,
		dialog,
		fetchFiles,
		handleFileClick: (file: any) => handleFileClick(file, fetchFiles),
		handleSave,
		handleCloseFileView,
		handleBack,
		handleCopy,
		handlePaste,
		handleMkdir,
		handleNewFile,
		handleRename,
		handleDelete,
	};
}

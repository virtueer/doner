import { useCallback, useEffect, useState } from "react";
import type { DialogState } from "@/components/common/AppDialog";
import { api } from "@/lib/api";
import { useFileActions } from "./useFileActions";
import { useFileViewer } from "./useFileViewer";

export function useFileOperations(
	apiPrefix: string,
	onUnsavedChangesChange?: (hasUnsaved: boolean) => void,
) {
	const [currentPath, setCurrentPath] = useState("/");
	const [pathInput, setPathInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [files, setFiles] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dialog, setDialog] = useState<DialogState | null>(null);

	const ask = <T>(
		config: Omit<DialogState, "isOpen" | "onConfirm" | "onCancel">,
		onConfirm: (value?: string) => T,
		onCancel: T,
	) =>
		new Promise<T>((resolve) => {
			setDialog({
				...config,
				isOpen: true,
				onConfirm: (value) => {
					setDialog(null);
					resolve(onConfirm(value));
				},
				onCancel: () => {
					setDialog(null);
					resolve(onCancel);
				},
			});
		});

	const showAlert = (title: string, message: string) =>
		ask<void>({ kind: "alert", title, message }, () => undefined, undefined);

	const showConfirm = (title: string, message: string) =>
		ask({ kind: "confirm", title, message }, () => true, false);

	const showPrompt = (title: string, message: string, defaultValue = "") =>
		ask<string | null>(
			{ kind: "prompt", title, message, defaultValue, confirmLabel: "Submit" },
			(value) => value || null,
			null,
		);

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
				const res = await api.get(`${apiPrefix}/files`, { params: { path } });
				setFiles(res.data);
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

	const actions = useFileActions(
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
		...actions,
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
		dialog,
		fetchFiles,
		handleFileClick: (file: any) => handleFileClick(file, fetchFiles),
		handleSave,
		handleCloseFileView,
		handleBack,
	};
}

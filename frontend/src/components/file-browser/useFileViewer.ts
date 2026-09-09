import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getLanguageFromExtension } from "./fileBrowserUtils";

export function useFileViewer(
	apiPrefix: string,
	showAlert: (title: string, message: string) => Promise<void>,
	showConfirm: (title: string, message: string) => Promise<boolean>,
	onUnsavedChangesChange?: (hasUnsaved: boolean) => void,
) {
	const [viewFile, setViewFile] = useState<string | null>(null);
	const [viewFilePath, setViewFilePath] = useState<string | null>(null);
	const [fileContent, setFileContent] = useState<string>("");
	const [selectedLanguage, setSelectedLanguage] = useState("plaintext");
	const [fileLoading, setFileLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState("");
	const [saving, setSaving] = useState(false);

	const handleFileClick = async (
		file: any,
		onDirClick: (path: string) => void,
	) => {
		if (file.type === "directory" || file.type === "symlink") {
			onDirClick(file.path);
		} else {
			try {
				setFileLoading(true);
				setViewFile(file.name);
				setViewFilePath(file.path);
				setIsEditing(false);
				const res = await api.get(`${apiPrefix}/files/read`, {
					params: { path: file.path },
				});
				setFileContent(res.data.content);
				setEditContent(res.data.content);
				setSelectedLanguage(getLanguageFromExtension(file.name));
			} catch (err: any) {
				setFileContent(`Error: ${err.message}`);
			} finally {
				setFileLoading(false);
			}
		}
	};

	const handleSave = async () => {
		if (!viewFilePath) return;
		try {
			setSaving(true);
			await api.post(
				`${apiPrefix}/files/write`,
				{ content: editContent },
				{
					params: { path: viewFilePath },
				},
			);
			setFileContent(editContent);
			setIsEditing(false);
		} catch (err: any) {
			await showAlert("Error", `Save failed: ${err.message}`);
		} finally {
			setSaving(false);
		}
	};

	const hasUnsavedChanges = isEditing && editContent !== fileContent;

	useEffect(() => {
		if (onUnsavedChangesChange) {
			onUnsavedChangesChange(hasUnsavedChanges);
		}
	}, [hasUnsavedChanges, onUnsavedChangesChange]);

	const handleCloseFileView = async () => {
		if (hasUnsavedChanges) {
			if (
				!(await showConfirm(
					"Unsaved Changes",
					"Are you sure you want to discard unsaved changes?",
				))
			)
				return;
		}
		setViewFile(null);
		setViewFilePath(null);
		setIsEditing(false);
	};

	return {
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
	};
}

import { useCallback, useRef } from "react";
import { api } from "@/lib/api";
import {
	getLanguageFromExtension,
	getUniqueName,
	globalClipboard,
} from "@/lib/fileUtils";

interface UseFileOperationsProps {
	apiPrefix: string;
	currentPath: string;
	files: any[];
	setFiles: (files: any[]) => void;
	setCurrentPath: (path: string) => void;
	setPathInput: (path: string) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setViewFile: (file: string | null) => void;
	setViewFilePath: (path: string | null) => void;
	setFileContent: (content: string) => void;
	setEditContent: (content: string) => void;
	setSelectedLanguage: (lang: string) => void;
	setFileLoading: (loading: boolean) => void;
	setIsEditing: (editing: boolean) => void;
	setSaving: (saving: boolean) => void;
	setCopiedFile: (file: any) => void;
	showAlert: (title: string, msg: string) => Promise<void>;
	showPrompt: (
		title: string,
		msg: string,
		def?: string,
	) => Promise<string | null>;
	showConfirm: (title: string, msg: string) => Promise<boolean>;
}

export function useFileOperations(p: UseFileOperationsProps) {
	const pRef = useRef(p);
	pRef.current = p;

	const getSafeDestPath = (name: string) => {
		const safePath = pRef.current.currentPath.endsWith("/")
			? pRef.current.currentPath
			: `${pRef.current.currentPath}/`;
		return pRef.current.currentPath === "/" ? name : safePath + name;
	};

	const fetchFiles = useCallback(async (path: string) => {
		try {
			pRef.current.setLoading(true);
			pRef.current.setError(null);
			pRef.current.setViewFile(null);
			const res = await api.get(
				`${pRef.current.apiPrefix}/files?path=${encodeURIComponent(path)}`,
			);
			pRef.current.setFiles(res.data);
			pRef.current.setCurrentPath(path);
			pRef.current.setPathInput(path.startsWith("/") ? path : `/${path}`);
		} catch (err: any) {
			pRef.current.setError(err.message);
		} finally {
			pRef.current.setLoading(false);
		}
	}, []);

	const handleFileClick = async (file: any) => {
		if (file.type === "directory" || file.type === "symlink") {
			fetchFiles(file.path);
		} else {
			try {
				p.setFileLoading(true);
				p.setViewFile(file.name);
				p.setViewFilePath(file.path);
				p.setIsEditing(false);
				const res = await api.get(
					`${p.apiPrefix}/files/read?path=${encodeURIComponent(file.path)}`,
				);
				p.setFileContent(res.data.content);
				p.setEditContent(res.data.content);
				p.setSelectedLanguage(getLanguageFromExtension(file.name));
			} catch (err: any) {
				p.setFileContent(`Error: ${err.message}`);
			} finally {
				p.setFileLoading(false);
			}
		}
	};

	const handleSave = async (
		viewFilePath: string | null,
		editContent: string,
	) => {
		if (!viewFilePath) return;
		try {
			p.setSaving(true);
			await api.post(
				`${p.apiPrefix}/files/write?path=${encodeURIComponent(viewFilePath)}`,
				{ content: editContent },
			);
			p.setFileContent(editContent);
			p.setIsEditing(false);
		} catch (err: any) {
			await p.showAlert("Error", `Save failed: ${err.message}`);
		} finally {
			p.setSaving(false);
		}
	};

	const handleCloseFileView = async (hasUnsavedChanges: boolean) => {
		if (
			hasUnsavedChanges &&
			!(await p.showConfirm(
				"Unsaved Changes",
				"Are you sure you want to discard unsaved changes?",
			))
		)
			return;
		p.setViewFile(null);
		p.setViewFilePath(null);
		p.setIsEditing(false);
	};

	const handleBack = () => {
		if (p.currentPath === "/") return;
		const parts = p.currentPath.replace(/\/$/, "").split("/");
		parts.pop();
		fetchFiles(parts.length > 0 ? parts.join("/") : "/");
	};

	const handleExport = (file?: any) => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const url = file
			? `${apiUrl}${p.apiPrefix}/export?path=${encodeURIComponent(file.path)}`
			: `${apiUrl}${p.apiPrefix}/export`;
		window.open(url, "_blank");
	};

	const handleCopy = (file: any) => {
		const clip = {
			apiPrefix: p.apiPrefix,
			path: file.path,
			name: file.name,
			type: file.type,
		};
		globalClipboard.current = clip;
		p.setCopiedFile(clip);
	};

	const handlePaste = async () => {
		if (!globalClipboard.current) return;
		if (globalClipboard.current.apiPrefix !== p.apiPrefix) {
			await p.showAlert(
				"Unsupported",
				"Cross-node copy/paste is not supported yet.",
			);
			return;
		}
		try {
			const pasteName = p.files.some(
				(f) => f.name === globalClipboard.current?.name,
			)
				? getUniqueName(globalClipboard.current?.name, p.files)
				: globalClipboard.current?.name;
			const destPath = getSafeDestPath(pasteName);
			await api.post(`${p.apiPrefix}/files/copy`, {
				srcPath: globalClipboard.current.path,
				destPath,
			});
			fetchFiles(p.currentPath);
		} catch (err: any) {
			await p.showAlert("Error", `Paste failed: ${err.message}`);
		}
	};

	const handleMkdir = async () => {
		const name = await p.showPrompt("New Folder", "New folder name:");
		if (!name) return;
		try {
			await api.post(
				`${p.apiPrefix}/files/mkdir?path=${encodeURIComponent(getSafeDestPath(name))}`,
			);
			fetchFiles(p.currentPath);
		} catch (err: any) {
			await p.showAlert("Error", `Create folder failed: ${err.message}`);
		}
	};

	const handleNewFile = async () => {
		const name = await p.showPrompt("New File", "New file name:");
		if (!name) return;
		try {
			await api.post(
				`${p.apiPrefix}/files/write?path=${encodeURIComponent(getSafeDestPath(name))}`,
				{ content: "" },
			);
			fetchFiles(p.currentPath);
		} catch (err: any) {
			await p.showAlert("Error", `Create file failed: ${err.message}`);
		}
	};

	const handleRename = async (file: any) => {
		const newName = await p.showPrompt("Rename", "Enter new name:", file.name);
		if (!newName || newName === file.name) return;
		try {
			await api.post(`${p.apiPrefix}/files/rename`, {
				srcPath: file.path,
				destPath: getSafeDestPath(newName),
			});
			fetchFiles(p.currentPath);
		} catch (err: any) {
			await p.showAlert("Error", `Rename failed: ${err.message}`);
		}
	};

	const handleDelete = async (file: any) => {
		if (
			!(await p.showConfirm(
				"Delete File",
				`Are you sure you want to delete ${file.name}?`,
			))
		)
			return;
		try {
			await api.post(
				`${p.apiPrefix}/files/delete?path=${encodeURIComponent(file.path)}`,
			);
			fetchFiles(p.currentPath);
		} catch (err: any) {
			await p.showAlert("Error", `Delete failed: ${err.message}`);
		}
	};

	const handleEditContext = (file: any) => {
		if (file.type !== "file") return;
		handleFileClick(file).then(() => p.setIsEditing(true));
	};

	return {
		fetchFiles,
		handleFileClick,
		handleSave,
		handleCloseFileView,
		handleBack,
		handleExport,
		handleExportItem: handleExport,
		handleCopy,
		handlePaste,
		handleMkdir,
		handleNewFile,
		handleRename,
		handleDelete,
		handleEditContext,
	};
}

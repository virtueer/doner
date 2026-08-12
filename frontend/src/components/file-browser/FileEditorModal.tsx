import { Editor } from "@monaco-editor/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileEditorModalProps {
	viewFile: string;
	fileLoading: boolean;
	isEditing: boolean;
	setIsEditing: (editing: boolean) => void;
	saving: boolean;
	selectedLanguage: string;
	setSelectedLanguage: (lang: string) => void;
	editContent: string;
	setEditContent: (content: string) => void;
	fileContent: string;
	handleSave: () => void;
	handleCloseFileView: () => void;
}

const SUPPORTED_LANGUAGES = [
	"javascript",
	"typescript",
	"json",
	"html",
	"css",
	"markdown",
	"yaml",
	"shell",
	"python",
	"go",
	"rust",
	"c",
	"cpp",
	"java",
	"plaintext",
];

export function FileEditorModal({
	viewFile,
	fileLoading,
	isEditing,
	setIsEditing,
	saving,
	selectedLanguage,
	setSelectedLanguage,
	editContent,
	setEditContent,
	fileContent,
	handleSave,
	handleCloseFileView,
}: FileEditorModalProps) {
	return (
		<div
			className="absolute inset-0 flex flex-col bg-[#1e1e1e] z-10"
			onClick={(e) => e.stopPropagation()}
		>
			<div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-4">
					<span className="text-sm font-mono text-foreground truncate">
						{viewFile}
					</span>
					<select
						value={selectedLanguage}
						onChange={(e) => setSelectedLanguage(e.target.value)}
						className="bg-background text-xs text-foreground border border-input rounded px-2 py-1 outline-none focus:border-ring"
					>
						{SUPPORTED_LANGUAGES.map((lang) => (
							<option key={lang} value={lang}>
								{lang}
							</option>
						))}
					</select>
				</div>
				<div className="flex items-center gap-2">
					{!fileLoading && !isEditing && (
						<Button
							size="xs"
							variant="outline"
							onClick={() => setIsEditing(true)}
						>
							Edit
						</Button>
					)}
					{isEditing && (
						<>
							<Button
								size="xs"
								variant="ghost"
								onClick={() => {
									setIsEditing(false);
									setEditContent(fileContent);
								}}
								disabled={saving}
							>
								Cancel
							</Button>
							<Button size="xs" onClick={handleSave} disabled={saving}>
								{saving ? "Saving..." : "Save"}
							</Button>
						</>
					)}
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={handleCloseFileView}
						className="ml-1"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<div className="flex-1 overflow-auto p-4 flex flex-col">
				{fileLoading ? (
					<div className="text-muted-foreground text-sm animate-pulse">
						Loading content...
					</div>
				) : (
					<Editor
						height="100%"
						language={selectedLanguage}
						theme="vs-dark"
						value={isEditing ? editContent : fileContent}
						onChange={(val) => {
							if (isEditing) setEditContent(val || "");
						}}
						options={{
							readOnly: !isEditing,
							minimap: { enabled: false },
							fontSize: 12,
							wordWrap: "on",
						}}
					/>
				)}
			</div>
		</div>
	);
}

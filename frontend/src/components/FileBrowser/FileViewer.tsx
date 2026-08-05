import { Editor } from "@monaco-editor/react";
import { X } from "lucide-react";

export function FileViewer({
	viewFile,
	selectedLanguage,
	setSelectedLanguage,
	fileLoading,
	isEditing,
	setIsEditing,
	saving,
	fileContent,
	editContent,
	setEditContent,
	handleSave,
	handleCloseFileView,
}: {
	viewFile: string;
	selectedLanguage: string;
	setSelectedLanguage: (lang: string) => void;
	fileLoading: boolean;
	isEditing: boolean;
	setIsEditing: (editing: boolean) => void;
	saving: boolean;
	fileContent: string;
	editContent: string;
	setEditContent: (content: string) => void;
	handleSave: () => void;
	handleCloseFileView: () => void;
}) {
	return (
		<div
			className="absolute inset-0 flex flex-col bg-[#1e1e1e] z-10"
			onClick={(e) => e.stopPropagation()}
		>
			<div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-4">
					<span className="text-sm font-mono text-white/90 truncate">
						{viewFile}
					</span>
					<select
						value={selectedLanguage}
						onChange={(e) => setSelectedLanguage(e.target.value)}
						className="bg-[#121212] text-xs text-white/80 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500/50"
					>
						{[
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
						].map((lang) => (
							<option key={lang} value={lang}>
								{lang}
							</option>
						))}
					</select>
				</div>
				<div className="flex items-center gap-2">
					{!fileLoading && !isEditing && (
						<button
							onClick={() => setIsEditing(true)}
							className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80 transition-colors"
						>
							Edit
						</button>
					)}
					{isEditing && (
						<>
							<button
								onClick={() => {
									setIsEditing(false);
									setEditContent(fileContent);
								}}
								disabled={saving}
								className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80 transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								disabled={saving}
								className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors disabled:opacity-50"
							>
								{saving ? "Saving..." : "Save"}
							</button>
						</>
					)}
					<button
						onClick={handleCloseFileView}
						className="p-1 hover:bg-white/10 rounded text-white/70 ml-2"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-auto p-4 flex flex-col">
				{fileLoading ? (
					<div className="text-white/50 text-sm animate-pulse">
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

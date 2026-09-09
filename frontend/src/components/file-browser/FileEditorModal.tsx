import { Editor } from "@monaco-editor/react";
import { X } from "lucide-react";
import { SimpleSelect, toOptions } from "@/components/common/SimpleSelect";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES } from "./fileBrowserUtils";

const LANGUAGE_OPTIONS = toOptions(SUPPORTED_LANGUAGES);

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
		<div className="absolute inset-0 z-10 flex flex-col bg-surface">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-raised px-4 py-2">
				<div className="flex min-w-0 items-center gap-4">
					<span className="truncate font-mono text-sm">{viewFile}</span>
					<SimpleSelect
						value={selectedLanguage}
						onValueChange={setSelectedLanguage}
						options={LANGUAGE_OPTIONS}
					/>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{!fileLoading &&
						(isEditing ? (
							<>
								<Button
									size="sm"
									variant="ghost"
									disabled={saving}
									onClick={() => {
										setIsEditing(false);
										setEditContent(fileContent);
									}}
								>
									Cancel
								</Button>
								<Button size="sm" disabled={saving} onClick={handleSave}>
									{saving ? "Saving..." : "Save"}
								</Button>
							</>
						) : (
							<Button
								size="sm"
								variant="outline"
								onClick={() => setIsEditing(true)}
							>
								Edit
							</Button>
						))}
					<Button variant="ghost" size="icon-sm" onClick={handleCloseFileView}>
						<X />
					</Button>
				</div>
			</header>

			<div className="flex-1 overflow-hidden p-4">
				{fileLoading ? (
					<p className="animate-pulse text-sm text-muted-foreground">
						Loading content...
					</p>
				) : (
					<Editor
						height="100%"
						language={selectedLanguage}
						theme="vs-dark"
						value={isEditing ? editContent : fileContent}
						onChange={(value) => isEditing && setEditContent(value || "")}
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

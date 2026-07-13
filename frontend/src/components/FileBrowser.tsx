import { useState, useEffect, useCallback } from 'react';
import { Folder, FileText, Download, ArrowLeft, X, Link, Database, Copy, Trash2, Edit2, ClipboardPaste, ExternalLink, FolderPlus, FilePlus, Type } from 'lucide-react';

let globalClipboard: { apiPrefix: string, path: string, name: string, type: 'file' | 'directory' } | null = null;

export function FileBrowser({
  apiPrefix,
  nodeName,
  type,
  mounts = [],
  isFullscreen = false,
  onUnsavedChangesChange
}: {
  apiPrefix: string;
  nodeName: string;
  type: 'volume' | 'container';
  mounts?: any[];
  isFullscreen?: boolean;
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewFile, setViewFile] = useState<string | null>(null);
  const [viewFilePath, setViewFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; file: any } | null>(null);
  const [copiedFile, setCopiedFile] = useState<{ path: string, name: string, type: 'file' | 'directory' } | null>(null);

  type DialogState = {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
  };
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const showAlert = (title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setDialog({ isOpen: true, type: 'alert', title, message, onConfirm: () => { setDialog(null); resolve(); }, onCancel: () => { setDialog(null); resolve(); } });
    });
  };

  const showConfirm = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm: () => { setDialog(null); resolve(true); }, onCancel: () => { setDialog(null); resolve(false); } });
    });
  };

  const showPrompt = (title: string, message: string, defaultValue = '') => {
    return new Promise<string | null>((resolve) => {
      setDialog({ isOpen: true, type: 'prompt', title, message, defaultValue, onConfirm: (val) => { setDialog(null); resolve(val || null); }, onCancel: () => { setDialog(null); resolve(null); } });
    });
  };

  const [pathInput, setPathInput] = useState('');

  const fetchFiles = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      setViewFile(null);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}${apiPrefix}/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data);
      setCurrentPath(path);
      setPathInput(path.startsWith('/') ? path : '/' + path);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix]);

  useEffect(() => {
    fetchFiles('/');
  }, [fetchFiles]);

  // Click away listener for context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleFileClick = async (file: any) => {
    if (file.type === 'directory' || file.type === 'symlink') {
      fetchFiles(file.path);
    } else {
      // Read file
      try {
        setFileLoading(true);
        setViewFile(file.name);
        setViewFilePath(file.path);
        setIsEditing(false);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}${apiPrefix}/files/read?path=${encodeURIComponent(file.path)}`);
        if (!res.ok) throw new Error('Failed to read file');
        const data = await res.json();
        setFileContent(data.content);
        setEditContent(data.content);
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}${apiPrefix}/files/write?path=${encodeURIComponent(viewFilePath)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error('Failed to write file');
      setFileContent(editContent);
      setIsEditing(false);
    } catch (err: any) {
      await showAlert('Error', `Save failed: ${err.message}`);
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
      if (!(await showConfirm('Unsaved Changes', 'Are you sure you want to discard unsaved changes?'))) return;
    }
    setViewFile(null);
    setViewFilePath(null);
    setIsEditing(false);
  };

  const handleBack = () => {
    if (currentPath === '/') return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    fetchFiles(parts.length > 0 ? parts.join('/') : '/');
  };

  const handleExport = () => {
    if (type !== 'volume') return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.open(`${apiUrl}${apiPrefix}/export`, '_blank');
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const handleContextMenu = (e: React.MouseEvent, file: any) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  const handleCopy = (file: any) => {
    const clipboardData = {
      apiPrefix,
      path: file.path,
      name: file.name,
      type: file.type
    };
    globalClipboard = clipboardData;
    setCopiedFile(clipboardData);
  };

  const getUniqueName = (name: string, fileList: any[]) => {
    let newName = name;
    let counter = 1;
    const nameWithoutExt = name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';

    while (fileList.some(f => f.name === newName)) {
      newName = `${nameWithoutExt}-${counter}${ext}`;
      counter++;
    }
    return newName;
  };

  const handlePaste = async () => {
    if (!globalClipboard) return;
    if (globalClipboard.apiPrefix !== apiPrefix) {
      await showAlert('Unsupported', 'Cross-node copy/paste is not supported yet.');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const safeCurrentPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';

      const pasteName = files.some(f => f.name === globalClipboard?.name)
        ? getUniqueName(globalClipboard?.name, files)
        : globalClipboard?.name;

      const destPath = currentPath === '/' ? pasteName : safeCurrentPath + pasteName;

      const res = await fetch(`${apiUrl}${apiPrefix}/files/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcPath: globalClipboard.path, destPath }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to copy file');
      }
      fetchFiles(currentPath);
    } catch (err: any) {
      await showAlert('Error', `Paste failed: ${err.message}`);
    }
  };

  const handleMkdir = async () => {
    const name = await showPrompt("New Folder", "New folder name:");
    if (!name) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const safeCurrentPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
      const destPath = currentPath === '/' ? name : safeCurrentPath + name;
      const res = await fetch(`${apiUrl}${apiPrefix}/files/mkdir?path=${encodeURIComponent(destPath)}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to create directory');
      fetchFiles(currentPath);
    } catch (err: any) {
      await showAlert('Error', `Create folder failed: ${err.message}`);
    }
  };

  const handleNewFile = async () => {
    const name = await showPrompt("New File", "New file name:");
    if (!name) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const safeCurrentPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
      const destPath = currentPath === '/' ? name : safeCurrentPath + name;
      const res = await fetch(`${apiUrl}${apiPrefix}/files/write?path=${encodeURIComponent(destPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });
      if (!res.ok) throw new Error('Failed to create file');
      fetchFiles(currentPath);
    } catch (err: any) {
      await showAlert('Error', `Create file failed: ${err.message}`);
    }
  };

  const handleRename = async (file: any) => {
    const newName = await showPrompt("Rename", "Enter new name:", file.name);
    if (!newName || newName === file.name) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const safeCurrentPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
      const destPath = currentPath === '/' ? newName : safeCurrentPath + newName;
      const res = await fetch(`${apiUrl}${apiPrefix}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcPath: file.path, destPath }),
      });
      if (!res.ok) throw new Error('Failed to rename file');
      fetchFiles(currentPath);
    } catch (err: any) {
      await showAlert('Error', `Rename failed: ${err.message}`);
    }
  };

  const handleDelete = async (file: any) => {
    if (!(await showConfirm("Delete File", `Are you sure you want to delete ${file.name}?`))) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}${apiPrefix}/files/delete?path=${encodeURIComponent(file.path)}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to delete file');
      fetchFiles(currentPath);
    } catch (err: any) {
      await showAlert('Error', `Delete failed: ${err.message}`);
    }
  };

  const handleEditContext = (file: any) => {
    if (file.type !== 'file') return;
    handleFileClick(file).then(() => {
      setIsEditing(true);
    });
  };

  const isMountPoint = (filePath: string) => {
    if (!mounts || mounts.length === 0) return false;
    // ensure absolute path checking
    const absolutePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return mounts.some((m: any) => m.Destination === absolutePath || m.Destination === absolutePath + '/');
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] relative">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-white/5">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
          <button
            onClick={handleBack}
            disabled={currentPath === '/'}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent text-white/80 shrink-0 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center text-xs text-white/70 font-mono shrink-0">
            {nodeName}:
          </div>
          <form onSubmit={(e) => { e.preventDefault(); fetchFiles(pathInput); }} className="flex-1 max-w-full">
            <input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              className="w-full bg-transparent border border-transparent focus:border-blue-500/50 rounded px-1 py-0.5 text-xs text-white/90 font-mono outline-none transition-colors"
              placeholder="/path/to/folder"
            />
          </form>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isFullscreen && (
            <button
              onClick={() => {
                const url = `${window.location.origin}?files=true&apiPrefix=${encodeURIComponent(apiPrefix)}&name=${encodeURIComponent(nodeName)}&type=${type}`;
                window.open(url, '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md transition-colors border border-white/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </button>
          )}
          {type === 'volume' && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-md transition-colors border border-blue-500/20"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative" onContextMenu={(e) => {
        // Allow pasting when right clicking on the empty area
        e.preventDefault();
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          file: null, // null means we clicked on the background
        });
      }}>
        {viewFile ? (
          <div className="absolute inset-0 flex flex-col bg-[#1e1e1e] z-10" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between shrink-0">
              <span className="text-sm font-mono text-white/90 truncate">{viewFile}</span>
              <div className="flex items-center gap-2">
                {!fileLoading && !isEditing && (
                  <button onClick={() => setIsEditing(true)} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80 transition-colors">
                    Edit
                  </button>
                )}
                {isEditing && (
                  <>
                    <button onClick={() => { setIsEditing(false); setEditContent(fileContent); }} disabled={saving} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80 transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                )}
                <button onClick={handleCloseFileView} className="p-1 hover:bg-white/10 rounded text-white/70 ml-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col">
              {fileLoading ? (
                <div className="text-white/50 text-sm animate-pulse">Loading content...</div>
              ) : isEditing ? (
                <textarea
                  className="flex-1 w-full bg-[#121212] border border-white/10 rounded p-3 text-xs font-mono text-green-400 focus:outline-none focus:border-blue-500/50 resize-none"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                  {fileContent || <span className="text-white/30 italic">Empty file</span>}
                </pre>
              )}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="p-4 text-white/50 text-sm animate-pulse">Loading directory...</div>
        ) : error ? (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        ) : files.length === 0 ? (
          <div className="p-4 text-white/40 text-sm italic">Empty directory</div>
        ) : (
          <div className="overflow-y-auto h-full p-2">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/40 font-medium">
                  <th className="pb-2 font-normal pl-2 w-full">Name</th>
                  <th className="pb-2 font-normal px-4 whitespace-nowrap w-[1%] text-right">Size</th>
                  <th className="pb-2 font-normal whitespace-nowrap w-[1%] pr-4 text-right">Modified</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => {
                  const isMount = isMountPoint(f.path);
                  return (
                    <tr
                      key={i}
                      onClick={() => handleFileClick(f)}
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, f);
                      }}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group h-10"
                    >
                      <td className="py-2 pl-2 max-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          {isMount ? (
                            <Database className="h-4 w-4 text-purple-500 shrink-0" />
                          ) : f.type === 'directory' ? (
                            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                          ) : f.type === 'symlink' ? (
                            <Link className="h-4 w-4 text-cyan-400 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-sm text-white/90 truncate group-hover:text-blue-400 transition-colors" title={f.name}>
                            {f.name}
                          </span>
                          {isMount && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 ml-1 shrink-0">
                              Mount
                            </span>
                          )}
                          {f.type === 'symlink' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 ml-1 shrink-0">
                              Shortcut
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-xs text-white/50 font-mono" title={formatBytes(f.size)}>
                        {formatBytes(f.size)}
                      </td>
                      <td className="py-2 whitespace-nowrap text-xs text-white/50 pr-4" title={new Date(f.mtime).toLocaleString()}>
                        {new Date(f.mtime).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-white/10 rounded-md shadow-2xl py-1 w-48 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file && contextMenu.file.type === 'file' && (
            <button
              className="w-full text-left px-4 py-2 hover:bg-blue-500/20 hover:text-blue-400 text-white/90 flex items-center gap-2 transition-colors"
              onClick={() => { handleEditContext(contextMenu.file); setContextMenu(null); }}
            >
              <Edit2 className="h-4 w-4" /> Edit
            </button>
          )}
          {contextMenu.file && (
            <>
              <button
                className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
                onClick={() => { handleRename(contextMenu.file); setContextMenu(null); }}
              >
                <Type className="h-4 w-4" /> Rename
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
                onClick={() => { handleCopy(contextMenu.file); setContextMenu(null); }}
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
            </>
          )}
          {!contextMenu.file && (
            <>
              <button
                className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
                onClick={() => { handleNewFile(); setContextMenu(null); }}
              >
                <FilePlus className="h-4 w-4" /> New File
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors"
                onClick={() => { handleMkdir(); setContextMenu(null); }}
              >
                <FolderPlus className="h-4 w-4" /> New Folder
              </button>
            </>
          )}
          <button
            className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            disabled={!globalClipboard || globalClipboard.apiPrefix !== apiPrefix}
            onClick={() => { handlePaste(); setContextMenu(null); }}
          >
            <ClipboardPaste className="h-4 w-4" /> Paste
          </button>
          {contextMenu.file && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button
                className="w-full text-left px-4 py-2 hover:bg-red-500/20 hover:text-red-400 text-red-500 flex items-center gap-2 transition-colors"
                onClick={() => { handleDelete(contextMenu.file); setContextMenu(null); }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Copied File Indicator */}
      {copiedFile && (
        <div className="absolute bottom-4 right-4 z-40 bg-blue-500/10 border border-blue-500/20 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-xs">
          <div className="bg-blue-500/20 p-1.5 rounded-md shrink-0">
            <Copy className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-xs font-medium text-white/90 truncate" title={copiedFile.name}>
              Copied {copiedFile.type === 'directory' ? 'folder' : 'file'}: {copiedFile.name}
            </span>
            <span className="text-[10px] text-white/50 truncate" title={copiedFile.path}>
              {copiedFile.path}
            </span>
          </div>
          <button 
            onClick={() => setCopiedFile(null)} 
            className="p-1 hover:bg-white/10 rounded-md transition-colors shrink-0 text-white/40 hover:text-white/80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {/* Dialog Modal */}
      {dialog && dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-medium text-white/90">{dialog.title}</h3>
              <button onClick={() => dialog.onCancel?.()} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-white/70 mb-4">{dialog.message}</p>
              {dialog.type === 'prompt' && (
                <input 
                  type="text" 
                  autoFocus
                  defaultValue={dialog.defaultValue}
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 outline-none focus:border-blue-500/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') dialog.onConfirm?.((e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') dialog.onCancel?.();
                  }}
                  id="dialog-prompt-input"
                />
              )}
            </div>
            <div className="px-5 py-4 bg-[#151515] flex items-center justify-end gap-3 border-t border-white/10">
              {dialog.type !== 'alert' && (
                <button
                  onClick={() => dialog.onCancel?.()}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/5 rounded-md transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === 'prompt') {
                    const val = (document.getElementById('dialog-prompt-input') as HTMLInputElement)?.value;
                    dialog.onConfirm?.(val);
                  } else {
                    dialog.onConfirm?.();
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  dialog.type === 'confirm' && dialog.title.toLowerCase().includes('delete') 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {dialog.type === 'alert' ? 'OK' : dialog.type === 'confirm' ? 'Confirm' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

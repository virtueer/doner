import { Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';

export function ImageNode({ data }: { data: any }) {
  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isUsed = data.isUsed !== false; // Default to true if missing
  const bgColor = isUsed ? 'bg-pink-500/10' : 'bg-slate-500/10';
  const iconBgColor = isUsed ? 'bg-pink-500/20 text-pink-500 group-hover:bg-pink-500/30' : 'bg-slate-500/20 text-slate-500 group-hover:bg-slate-500/30';
  const handleBg = isUsed ? 'bg-pink-500 hover:bg-pink-400' : 'bg-slate-500 hover:bg-slate-400';
  const borderHover = isUsed ? 'hover:border-pink-500/50' : 'hover:border-slate-500/50';

  return (
    <div className={`w-[250px] shadow-lg rounded-xl bg-card border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-xl ${borderHover} group cursor-pointer backdrop-blur-sm`}>
      <div className="flex flex-col">
        {/* Header */}
        <div className={`flex items-center gap-3 p-3 ${bgColor} border-b border-border/50`}>
          <div className={`p-2 rounded-lg group-hover:scale-110 transition-all duration-300 ${iconBgColor}`}>
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground break-words whitespace-normal leading-tight" title={data.label}>
              {data.label}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
              Docker Image
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 bg-card/50">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-mono text-foreground">{formatSize(data.size)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-mono text-foreground truncate pl-2" title={new Date(data.created * 1000).toLocaleString()}>
                {new Date(data.created * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="img-out"
        className={`w-3 h-3 ${handleBg} border-2 border-background translate-x-1.5 transition-transform hover:scale-125`}
      />
    </div>
  );
}

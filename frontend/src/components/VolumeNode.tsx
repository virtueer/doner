import { Handle, Position } from '@xyflow/react';
import { HardDrive } from 'lucide-react';

export function VolumeNode({ data }: { data: any }) {
  const displayName =
    data.label.length > 20
      ? data.label.substring(0, 8) + '...' + data.label.substring(data.label.length - 8)
      : data.label;

  return (
    <div className="w-[260px] rounded-xl border border-amber-500/40 bg-amber-950/50 backdrop-blur-md shadow-lg shadow-amber-500/10 p-0 overflow-visible relative">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-400 !-left-1.5" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-amber-400 !-right-1.5" />
      <div className="drag-handle flex items-center justify-between px-4 py-3 bg-amber-500/15 border-b border-amber-500/20 cursor-grab active:cursor-grabbing rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <HardDrive className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-sm font-bold text-amber-100 truncate max-w-[140px]" title={data.label}>
            {displayName}
          </span>
        </div>
        <span className="font-mono text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
          {data.driver || 'local'}
        </span>
      </div>
      {data.mountpoint && (
        <div className="px-4 py-2.5">
          <div
            className="text-[10px] font-mono truncate px-2 py-1.5 rounded-md bg-amber-500/5 border border-amber-500/10 text-amber-300/70"
            title={data.mountpoint}
          >
            {data.mountpoint}
          </div>
        </div>
      )}
    </div>
  );
}

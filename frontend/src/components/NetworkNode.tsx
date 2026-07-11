import { Handle, Position } from '@xyflow/react';
import { Network } from 'lucide-react';

export function NetworkNode({ data }: { data: any }) {
  return (
    <div className="network-node">
      <Handle type="target" position={Position.Right} className="w-3 !bg-indigo-400" />
      <div className="w-[280px] rounded-xl border border-indigo-500/40 bg-indigo-950/60 backdrop-blur-md shadow-lg shadow-indigo-500/10 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-500/15 border-b border-indigo-500/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/20">
              <Network className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-indigo-100 truncate max-w-[160px]" title={data.label}>
              {data.label}
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-500/25 text-indigo-300 rounded-full">
            {data.count || 0}
          </span>
        </div>
        <div className="px-4 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300">
              {data.driver}
            </span>
            {data.scope && (
              <span className="text-[10px] text-indigo-400/70">
                {data.scope}
              </span>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Left} className="w-3 !bg-indigo-400" />
    </div>
  );
}

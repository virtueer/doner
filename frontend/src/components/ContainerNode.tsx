import { Handle, Position } from '@xyflow/react';
import { Box } from 'lucide-react';

export function ContainerNode({ data }: { data: any }) {
  const isRunning = data.state === 'running';

  return (
    <div
      className="w-[310px] rounded-xl border backdrop-blur-md shadow-lg p-0 overflow-visible relative cursor-pointer transition-all hover:shadow-xl"
      style={{
        borderColor: isRunning ? 'rgba(34, 197, 94, 0.35)' : 'rgba(156, 163, 175, 0.35)',
        backgroundColor: isRunning ? 'rgba(20, 83, 45, 0.4)' : 'rgba(55, 65, 81, 0.4)',
        boxShadow: isRunning
          ? '0 4px 20px rgba(34, 197, 94, 0.08)'
          : '0 4px 20px rgba(156, 163, 175, 0.08)',
      }}
    >
      <Handle type="target" position={Position.Left} id="net-in" className="!w-3 !h-3 !bg-indigo-400 !-left-1.5" style={{ top: '40%' }} />
      <Handle type="source" position={Position.Left} id="net-out" className="!w-3 !h-3 !bg-indigo-400 !-left-1.5" style={{ top: '60%' }} />
      <Handle type="source" position={Position.Right} id="vol-out" className="!w-3 !h-3 !bg-amber-400 !-right-1.5" style={{ top: '40%' }} />
      <Handle type="target" position={Position.Right} id="vol-in" className="!w-3 !h-3 !bg-amber-400 !-right-1.5" style={{ top: '60%' }} />
      <div
        className="drag-handle flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing rounded-t-xl"
        style={{
          backgroundColor: isRunning ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
          borderColor: isRunning ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-md"
            style={{ backgroundColor: isRunning ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)' }}
          >
            <Box className="h-4 w-4" style={{ color: isRunning ? '#4ade80' : '#9ca3af' }} />
          </div>
          <span className="text-sm font-bold text-white truncate max-w-[190px]" title={data.label}>
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-2.5 w-2.5 rounded-full shadow-sm"
            style={{
              backgroundColor: isRunning ? '#22c55e' : '#9ca3af',
              boxShadow: isRunning ? '0 0 6px rgba(34,197,94,0.5)' : '0 0 6px rgba(156,163,175,0.5)',
            }}
          />
          <span className="text-[10px] capitalize font-medium" style={{ color: isRunning ? '#86efac' : '#d1d5db' }}>
            {data.state}
          </span>
        </div>
      </div>
      <div className="px-4 py-2.5">
        <div
          className="text-[11px] font-mono truncate px-2 py-1.5 rounded-md border"
          title={data.image}
          style={{
            color: isRunning ? 'rgba(134, 239, 172, 0.8)' : 'rgba(209, 213, 219, 0.8)',
            backgroundColor: isRunning ? 'rgba(34, 197, 94, 0.06)' : 'rgba(156, 163, 175, 0.06)',
            borderColor: isRunning ? 'rgba(34, 197, 94, 0.12)' : 'rgba(156, 163, 175, 0.12)',
          }}
        >
          {data.image}
        </div>
      </div>
    </div>
  );
}

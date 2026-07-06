import { NodeResizer } from '@xyflow/react';
import { Server } from 'lucide-react';

export function NetworkNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <>
      <NodeResizer minWidth={350} minHeight={200} isVisible={selected} lineClassName="border-primary" handleClassName="h-3 w-3 bg-primary rounded border-none" />
      <div className="w-full h-full rounded-xl border-2 border-primary/40 bg-card/10 backdrop-blur-sm flex flex-col">
        <div className="flex flex-row items-center justify-between p-4 bg-card/80 border-b border-primary/20 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold" title={data.label}>
              {data.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              {data.driver}
            </span>
            <span className="text-xs font-semibold px-2 py-1 bg-primary/20 text-primary rounded-full">
              {data.count || 0} Containers
            </span>
          </div>
        </div>
        <div className="flex-1">
          {/* Empty space for containers */}
        </div>
      </div>
    </>
  );
}

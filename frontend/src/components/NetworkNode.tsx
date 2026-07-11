import { Handle, Position } from '@xyflow/react';
import { Network } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NetworkNode({ data }: { data: any }) {
  return (
    <>
      <Handle type="target" position={Position.Right} className="w-3 !bg-indigo-500" />
      <Card className="w-[280px] shadow-lg bg-card/95 backdrop-blur-md border-l-4 border-l-indigo-500 p-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold truncate w-[180px]" title={data.label}>
            {data.label}
          </CardTitle>
          <Network className="h-5 w-5 text-indigo-400" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              {data.driver}
            </span>
            <span className="text-xs font-semibold px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full">
              {data.count || 0} Containers
            </span>
          </div>
          {data.scope && (
            <div className="text-xs text-muted-foreground">
              Scope: <span className="font-medium text-foreground">{data.scope}</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Left} className="w-3 !bg-indigo-500" />
    </>
  );
}

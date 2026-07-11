import { Handle, Position } from '@xyflow/react';
import { HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function VolumeNode({ data }: { data: any }) {
  // Truncate long volume names for display
  const displayName = data.label.length > 20
    ? data.label.substring(0, 8) + '...' + data.label.substring(data.label.length - 8)
    : data.label;

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 !bg-amber-500" />
      <Card className="w-[260px] shadow-lg bg-card/95 backdrop-blur-md border-l-4 border-l-amber-500 p-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold truncate w-[170px]" title={data.label}>
            {displayName}
          </CardTitle>
          <HardDrive className="h-5 w-5 text-amber-400" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              {data.driver || 'local'}
            </span>
          </div>
          {data.mountpoint && (
            <div className="text-xs text-muted-foreground font-mono truncate bg-muted/50 p-2 rounded-md" title={data.mountpoint}>
              {data.mountpoint}
            </div>
          )}
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 !bg-amber-500" />
    </>
  );
}

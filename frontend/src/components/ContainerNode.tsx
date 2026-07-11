import { Handle, Position } from '@xyflow/react';
import { Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ContainerNode({ data }: { data: any }) {
  const isRunning = data.state === 'running';

  return (
    <>
      <Handle type="target" position={Position.Left} id="net-in" className="w-3 !bg-indigo-500" style={{ top: '40%' }} />
      <Handle type="source" position={Position.Left} id="net-out" className="w-3 !bg-indigo-500" style={{ top: '60%' }} />
      <Card
        className="w-[310px] shadow-lg bg-card/95 backdrop-blur-md border-l-4 p-2 cursor-pointer hover:shadow-xl transition-shadow"
        style={{ borderLeftColor: isRunning ? '#22c55e' : '#ef4444' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold truncate w-[220px]" title={data.label}>
            {data.label}
          </CardTitle>
          <Box className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground font-mono truncate bg-muted/50 p-2 rounded-md" title={data.image}>
            {data.image}
          </div>
          <div className="mt-4 flex items-center space-x-3 bg-background p-2 rounded-md border border-border/50">
            <span className={`flex h-3 w-3 rounded-full shadow-sm ${isRunning ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
            <span className="text-sm capitalize font-medium">{data.state}</span>
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Right} id="vol-out" className="w-3 !bg-amber-500" style={{ top: '40%' }} />
      <Handle type="target" position={Position.Right} id="vol-in" className="w-3 !bg-amber-500" style={{ top: '60%' }} />
    </>
  );
}

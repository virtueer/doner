import { Activity, X } from "lucide-react";
import { ResizableSheet } from "@/components/common/ResizableSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TONE = {
	start: "border-success/25 bg-success/5 text-success",
	stop: "border-destructive/25 bg-destructive/5 text-destructive",
	neutral: "border-border bg-muted/40 text-foreground",
};

function toneFor(action: string) {
	if (action === "start") return TONE.start;
	if (action === "die" || action === "kill") return TONE.stop;
	return TONE.neutral;
}

export function EventsSheet({
	events,
	onClose,
}: {
	events: any[];
	onClose: () => void;
}) {
	return (
		<ResizableSheet onClose={onClose} initial={0.4} min={300} max={0.9}>
			<header className="z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
				<h2 className="flex items-center gap-2 text-lg font-semibold">
					<Activity className="size-5 text-info" />
					Docker Events
				</h2>
				<Button variant="ghost" size="icon-sm" onClick={onClose}>
					<X />
				</Button>
			</header>

			<div className="flex-1 space-y-3 overflow-y-auto p-4">
				{events.length === 0 ? (
					<p className="py-10 text-center text-sm text-muted-foreground">
						Waiting for events...
					</p>
				) : (
					events.map((e, idx) => {
						const action = e.Action || e.status || "unknown";
						const timestamp = new Date(
							(e.time || e.timeNano / 1000000000) * 1000,
						);

						return (
							<article
								key={idx}
								className={cn("rounded-lg border p-3", toneFor(action))}
							>
								<div className="flex items-start justify-between gap-2">
									<h3 className="text-sm font-medium uppercase tracking-wider">
										{e.Type || e.type} • {action}
									</h3>
									<time className="shrink-0 text-xs text-muted-foreground">
										{timestamp.toLocaleTimeString()}
									</time>
								</div>
								<p className="mt-2 break-all font-mono text-sm text-foreground">
									{e.Actor?.Attributes?.name ||
										e.Actor?.ID?.substring(0, 12) ||
										"Unknown"}
								</p>
								{e.Actor?.Attributes?.image && (
									<p className="mt-1 font-mono text-xs text-muted-foreground">
										Image: {e.Actor.Attributes.image}
									</p>
								)}
							</article>
						);
					})
				)}
			</div>
		</ResizableSheet>
	);
}

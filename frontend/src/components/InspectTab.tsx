import { Check, Copy } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { renderJsonHighlight } from "@/lib/logHighlight";

export const InspectTab = memo(function InspectTab({
	data,
	loading,
	error,
}: {
	data: any;
	loading: boolean;
	error: string | null;
}) {
	const [copied, setCopied] = useState(false);

	const rootKeys = useMemo(() => (data ? Object.keys(data) : []), [data]);

	const sections = useMemo(() => {
		if (!data) return null;
		return rootKeys.map((key, index) => {
			const json = JSON.stringify({ [key]: data[key] }, null, 2);
			return (
				<span
					key={key}
					id={`json-section-${key}`}
					className="block scroll-mt-32"
				>
					{renderJsonHighlight(json.substring(2, json.length - 2))}
					{index < rootKeys.length - 1 && (
						<span className="text-muted-foreground">,</span>
					)}
				</span>
			);
		});
	}, [data, rootKeys]);

	const handleCopy = () => {
		if (!data) return;
		copyText(JSON.stringify(data, null, 2));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (loading || error || !data) {
		return (
			<div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
				{loading
					? "Loading inspect data..."
					: error
						? `Error: ${error}`
						: "No inspect data available."}
			</div>
		);
	}

	return (
		<>
			<div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-surface-raised px-6 py-2">
				<span className="mr-1 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
					Jump to:
				</span>
				{rootKeys.map((key) => (
					<Badge
						key={key}
						variant="outline"
						onClick={() =>
							document
								.getElementById(`json-section-${key}`)
								?.scrollIntoView({ behavior: "smooth", block: "start" })
						}
						className="cursor-pointer font-mono text-[11px] font-normal"
					>
						{key}
					</Badge>
				))}
			</div>

			<div className="relative flex-1 scroll-smooth overflow-y-auto p-6">
				<Button
					variant="outline"
					size="icon-sm"
					onClick={handleCopy}
					className="absolute right-8 top-8 z-10"
					title="Copy JSON"
				>
					{copied ? <Check className="text-success" /> : <Copy />}
				</Button>
				<pre className="m-0 overflow-x-auto rounded-lg border border-border bg-background/40 p-4 font-mono text-xs">
					<span className="text-muted-foreground">{"{\n"}</span>
					{sections}
					<span className="text-muted-foreground">{"}"}</span>
				</pre>
			</div>
		</>
	);
});

import { Check, Copy } from "lucide-react";
import { memo, useMemo, useState } from "react";
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
	const [copiedJson, setCopiedJson] = useState(false);

	const handleCopyJson = () => {
		if (!data) return;
		const jsonStr = JSON.stringify(data, null, 2);

		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(jsonStr);
		} else {
			const textArea = document.createElement("textarea");
			textArea.value = jsonStr;
			textArea.style.position = "fixed";
			textArea.style.left = "-999999px";
			textArea.style.top = "-999999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			try {
				document.execCommand("copy");
			} catch (error) {
				console.error("Fallback copy failed", error);
			}
			textArea.remove();
		}

		setCopiedJson(true);
		setTimeout(() => setCopiedJson(false), 2000);
	};

	const rootKeys = useMemo(() => (data ? Object.keys(data) : []), [data]);

	const renderedSections = useMemo(() => {
		if (!data) return null;
		return rootKeys.map((key, index) => {
			const str = JSON.stringify({ [key]: data[key] }, null, 2);
			const inner = str.substring(2, str.length - 2);
			return (
				<span
					key={key}
					id={`json-section-${key}`}
					className="scroll-mt-32 block"
				>
					{renderJsonHighlight(inner)}
					{index < rootKeys.length - 1 ? (
						<span style={{ color: "rgba(255,255,255,0.3)" }}>,</span>
					) : (
						""
					)}
				</span>
			);
		});
	}, [data, rootKeys]);

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
				Loading inspect data...
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-full items-center justify-center text-destructive text-sm p-4 text-center">
				Error: {error}
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
				No inspect data available.
			</div>
		);
	}

	return (
		<>
			{/* Sticky Root Keys Bar */}
			<div className="bg-[#121212] border-b border-white/5 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
				<span className="text-white/40 font-mono text-[10px] uppercase tracking-wider shrink-0 mr-1">
					Jump to:
				</span>
				{rootKeys.map((key) => (
					<button
						key={key}
						onClick={() => {
							const el = document.getElementById(`json-section-${key}`);
							if (el) {
								el.scrollIntoView({ behavior: "smooth", block: "start" });
							}
						}}
						className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-[11px] transition-colors shrink-0 border border-white/5"
					>
						{key}
					</button>
				))}
			</div>

			{/* JSON Content */}
			<div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
				<button
					onClick={handleCopyJson}
					className="absolute top-8 right-8 z-10 p-2 rounded-md bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
					title="Copy JSON"
				>
					{copiedJson ? (
						<Check className="h-4 w-4 text-green-500" />
					) : (
						<Copy className="h-4 w-4" />
					)}
				</button>
				<pre className="text-xs font-mono text-gray-300 overflow-x-auto bg-black/20 border border-white/5 p-4 rounded-lg m-0 relative">
					<span style={{ color: "rgba(255,255,255,0.3)" }}>{`{\n`}</span>
					{renderedSections}
					<span style={{ color: "rgba(255,255,255,0.3)" }}>{`}`}</span>
				</pre>
			</div>
		</>
	);
});

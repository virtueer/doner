import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { renderJsonHighlight } from "@/lib/logHighlight";

export function InspectTab({
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

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<span className="text-muted-foreground animate-pulse">
					Loading inspect data...
				</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 flex items-center justify-center text-destructive">
				{error}
			</div>
		);
	}

	if (!data) return null;

	const rootKeys = Object.keys(data);

	const handleScrollTo = (key: string) => {
		const el = document.getElementById(`json-section-${key}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<>
			{/* Sticky Badges Header */}
			<div className="sticky top-0 z-20 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-white/10 p-3 shrink-0 flex flex-wrap gap-2 max-h-32 overflow-y-auto shadow-md">
				{rootKeys.map((key) => {
					let badgeColor =
						"bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10";
					if (key === "Mounts")
						badgeColor =
							"bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200";
					else if (key === "Config")
						badgeColor =
							"bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200";
					else if (key === "NetworkSettings")
						badgeColor =
							"bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200";

					return (
						<button
							key={key}
							onClick={() => handleScrollTo(key)}
							className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${badgeColor}`}
						>
							{key}
						</button>
					);
				})}
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
					{rootKeys.map((key, index) => {
						const str = JSON.stringify({ [key]: data[key] }, null, 2);
						// Extract inner content without the outer braces
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
					})}
					<span style={{ color: "rgba(255,255,255,0.3)" }}>{`}`}</span>
				</pre>
			</div>
		</>
	);
}

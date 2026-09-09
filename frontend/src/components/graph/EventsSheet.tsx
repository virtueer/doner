import { Activity, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function EventsSheet({
	events,
	onClose,
}: {
	events: any[];
	onClose: () => void;
}) {
	const [sheetWidth, setSheetWidth] = useState(() => window.innerWidth * 0.4);
	const isResizing = useRef(false);

	const handleMouseDown = useCallback((_: React.MouseEvent) => {
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
	}, []);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			const newWidth = window.innerWidth - e.clientX;
			if (newWidth >= 300 && newWidth <= window.innerWidth * 0.9) {
				setSheetWidth(newWidth);
			}
		};
		const handleMouseUp = () => {
			if (isResizing.current) {
				isResizing.current = false;
				document.body.style.cursor = "default";
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "default";
		};
	}, []);

	return (
		<>
			<div
				className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity"
				onClick={onClose}
			/>
			<div
				className="fixed inset-y-0 right-0 z-50 bg-[#1e1e1e] border-l border-border shadow-2xl flex flex-col animate-slide-in-right will-change-transform"
				style={{ width: sheetWidth }}
			>
				<div
					className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-primary/20 transition-colors z-50 group flex items-center justify-center"
					onMouseDown={handleMouseDown}
				>
					<div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
				</div>

				<div className="px-6 py-4 border-b border-white/10 bg-card/95 backdrop-blur z-10 shrink-0 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-white flex items-center gap-2">
						<Activity className="h-5 w-5 text-blue-400" />
						Docker Events
					</h2>
					<button
						onClick={onClose}
						className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{events.length === 0 ? (
						<div className="text-white/50 text-sm text-center py-10">
							Waiting for events...
						</div>
					) : (
						events.map((e, idx) => {
							const actionStr = e.Action || e.status || "unknown";
							const isStart = actionStr === "start";
							const isDie = actionStr === "die" || actionStr === "kill";

							let bgColor = "bg-white/5";
							let borderColor = "border-white/10";
							let titleColor = "text-white/90";

							if (isStart) {
								bgColor = "bg-green-500/5";
								borderColor = "border-green-500/20";
								titleColor = "text-green-400";
							} else if (isDie) {
								bgColor = "bg-red-500/5";
								borderColor = "border-red-500/20";
								titleColor = "text-red-400";
							}

							return (
								<div
									key={idx}
									className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}
								>
									<div className="flex justify-between items-start mb-1">
										<div
											className={`text-sm font-medium uppercase tracking-wider ${titleColor}`}
										>
											{e.Type || e.type} • {actionStr}
										</div>
										<div className="text-xs text-white/40">
											{new Date(
												(e.time || e.timeNano / 1000000000) * 1000,
											).toLocaleTimeString()}
										</div>
									</div>
									<div className="text-sm text-white/80 font-mono mt-2 break-all">
										{e.Actor?.Attributes?.name ||
											e.Actor?.ID?.substring(0, 12) ||
											"Unknown"}
									</div>
									{e.Actor?.Attributes?.image && (
										<div className="text-xs text-white/40 font-mono mt-1">
											Image: {e.Actor.Attributes.image}
										</div>
									)}
								</div>
							);
						})
					)}
				</div>
			</div>
		</>
	);
}

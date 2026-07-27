import { useEffect, useRef, useState, useCallback } from "react";
import { renderAnsiLine } from "@/lib/ansi";

interface LogsTerminalProps {
	containerId: string;
	containerName: string;
}

export function LogsTerminal({
	containerId,
	containerName,
}: LogsTerminalProps) {
	const [logs, setLogs] = useState<string[]>([]);
	const [showTimestamps, setShowTimestamps] = useState(true);
	const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
	const logsEndRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const toggleLine = useCallback((index: number) => {
		setExpandedLines((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}, []);

	useEffect(() => {
		document.title = `${containerName} — Logs`;
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);

		es.onmessage = (event) => {
			let line: string;
			try {
				const parsed = JSON.parse(event.data);
				line = typeof parsed === "string" ? parsed : String(parsed ?? "");
			} catch {
				line = event.data ?? "";
			}
			if (line) {
				setLogs((prev) => {
					const updated = [...prev, line];
					return updated.length > 2000 ? updated.slice(-2000) : updated;
				});
			}
		};

		es.onerror = () => {
			es.close();
		};

		return () => {
			es.close();
		};
	}, [containerId, containerName]);

	// Auto-scroll when new logs arrive
	useEffect(() => {
		if (autoScroll) {
			logsEndRef.current?.scrollIntoView({ behavior: "auto" });
		}
	}, [logs, autoScroll]);

	// Detect manual scrolling to pause auto-scroll
	const handleScroll = useCallback(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
		setAutoScroll(atBottom);
	}, []);

	return (
		<div
			style={{
				height: "100vh",
				width: "100vw",
				background: "#000000",
				color: "#00ff41",
				display: "flex",
				flexDirection: "column",
				fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Consolas', monospace",
				fontSize: "13px",
				lineHeight: "1.5",
			}}
		>
			{/* Header Bar */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 16px",
					borderBottom: "1px solid #0a3d0a",
					background: "#000000",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						color: "#00aa2a",
						fontSize: "12px",
						fontWeight: 700,
						letterSpacing: "0.5px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<span
						style={{
							display: "inline-block",
							width: "8px",
							height: "8px",
							borderRadius: "50%",
							background: "#00ff41",
							boxShadow: "0 0 6px #00ff41, 0 0 12px #00ff4180",
							animation: "pulse-glow 2s ease-in-out infinite",
						}}
					/>
					<span style={{ color: "#005f15" }}>$</span> docker logs -f{" "}
					<span style={{ color: "#00ff41" }}>{containerName}</span>
				</div>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<span
						style={{
							color: "#005f15",
							fontSize: "11px",
							marginRight: "4px",
						}}
					>
						{logs.length} lines
					</span>
					<button
						type="button"
						onClick={() => setShowTimestamps(!showTimestamps)}
						style={{
							fontSize: "11px",
							color: "#00aa2a",
							background: "transparent",
							border: "1px solid #0a3d0a",
							borderRadius: "4px",
							padding: "4px 10px",
							cursor: "pointer",
							transition: "all 0.2s ease",
							fontFamily: "inherit",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = "#00ff41";
							e.currentTarget.style.color = "#00ff41";
							e.currentTarget.style.boxShadow = "0 0 8px #00ff4130";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = "#0a3d0a";
							e.currentTarget.style.color = "#00aa2a";
							e.currentTarget.style.boxShadow = "none";
						}}
					>
						{showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
					</button>
				</div>
			</div>

			{/* Log Lines */}
			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				style={{
					flex: 1,
					overflowY: "auto",
					overflowX: "hidden",
					padding: "0",
				}}
			>
				{logs.length === 0 && (
					<div
						style={{
							color: "#005f15",
							fontStyle: "italic",
							padding: "24px 16px",
							textAlign: "center",
						}}
					>
						<span style={{ opacity: 0.6 }}>▌</span> Waiting for logs...
					</div>
				)}

				{logs.map((line, i) => {
					const spaceIdx = line.indexOf(" ");
					let timestamp = "";
					let content = line;
					if (spaceIdx > 10 && spaceIdx <= 35) {
						const possibleTs = line.substring(0, spaceIdx);
						if (/^\d{4}-\d{2}-\d{2}T/.test(possibleTs)) {
							timestamp = possibleTs;
							content = line.substring(spaceIdx + 1);
						}
					}

					const isExpanded = expandedLines.has(i);

					return (
						<div
							key={i}
							onClick={() => toggleLine(i)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									toggleLine(i);
								}
							}}
							role="button"
							tabIndex={0}
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "0",
								borderBottom: "1px solid #0a1f0a",
								cursor: "pointer",
								transition: "background-color 0.15s ease",
								background: isExpanded ? "#001a00" : "transparent",
								...(isExpanded
									? {
											boxShadow:
												"inset 3px 0 0 #00ff41, 0 0 15px #00ff4108",
										}
									: {}),
							}}
							onMouseEnter={(e) => {
								if (!isExpanded) {
									e.currentTarget.style.background = "#0a0f0a";
								}
							}}
							onMouseLeave={(e) => {
								if (!isExpanded) {
									e.currentTarget.style.background = "transparent";
								}
							}}
						>
							{/* Line number */}
							<div
								style={{
									minWidth: "52px",
									textAlign: "right",
									paddingRight: "12px",
									paddingTop: "6px",
									paddingBottom: "6px",
									paddingLeft: "8px",
									color: "#0a3d0a",
									fontSize: "11px",
									userSelect: "none",
									borderRight: "1px solid #0a1f0a",
									flexShrink: 0,
								}}
							>
								{i + 1}
							</div>

							{/* Expand indicator */}
							<div
								style={{
									minWidth: "20px",
									paddingTop: "6px",
									paddingBottom: "6px",
									textAlign: "center",
									color: "#005f15",
									fontSize: "10px",
									userSelect: "none",
									flexShrink: 0,
									transition: "transform 0.2s ease",
									transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
								}}
							>
								▶
							</div>

							{/* Timestamp */}
							{timestamp && showTimestamps && (
								<div
									style={{
										paddingTop: "6px",
										paddingBottom: "6px",
										paddingRight: "12px",
										color: "#005f15",
										fontSize: "11px",
										userSelect: "none",
										flexShrink: 0,
										whiteSpace: "nowrap",
									}}
								>
									{timestamp}
								</div>
							)}

							{/* Log content */}
							<div
								style={{
									flex: 1,
									paddingTop: "6px",
									paddingBottom: "6px",
									paddingRight: "16px",
									minWidth: 0,
									...(isExpanded
										? {
												whiteSpace: "pre-wrap",
												wordBreak: "break-all",
											}
										: {
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}),
									color: "#00ff41",
								}}
							>
								{renderAnsiLine(content)}
							</div>
						</div>
					);
				})}
				<div ref={logsEndRef} />
			</div>

			{/* Auto-scroll indicator */}
			{!autoScroll && logs.length > 0 && (
				<button
					type="button"
					onClick={() => {
						setAutoScroll(true);
						logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
					}}
					style={{
						position: "fixed",
						bottom: "16px",
						right: "16px",
						background: "#001a00",
						border: "1px solid #00ff41",
						color: "#00ff41",
						borderRadius: "6px",
						padding: "8px 14px",
						fontSize: "11px",
						cursor: "pointer",
						fontFamily: "inherit",
						boxShadow: "0 0 12px #00ff4130, 0 2px 8px rgba(0,0,0,0.5)",
						zIndex: 100,
						transition: "all 0.2s ease",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.boxShadow =
							"0 0 20px #00ff4150, 0 2px 8px rgba(0,0,0,0.5)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.boxShadow =
							"0 0 12px #00ff4130, 0 2px 8px rgba(0,0,0,0.5)";
					}}
				>
					↓ Jump to bottom
				</button>
			)}

			{/* Inline keyframe animation for the pulse glow */}
			<style>{`
				@keyframes pulse-glow {
					0%, 100% { opacity: 1; box-shadow: 0 0 6px #00ff41, 0 0 12px #00ff4180; }
					50% { opacity: 0.5; box-shadow: 0 0 3px #00ff41, 0 0 6px #00ff4140; }
				}

				/* Scrollbar styling */
				div::-webkit-scrollbar {
					width: 6px;
				}
				div::-webkit-scrollbar-track {
					background: #000000;
				}
				div::-webkit-scrollbar-thumb {
					background: #0a3d0a;
					border-radius: 3px;
				}
				div::-webkit-scrollbar-thumb:hover {
					background: #00aa2a;
				}
			`}</style>
		</div>
	);
}

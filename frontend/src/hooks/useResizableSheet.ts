import { useCallback, useEffect, useRef, useState } from "react";

export function useResizableSheet(
	initialWidthRatio: number = 0.75,
	minWidth: number = 400,
) {
	const [sheetWidth, setSheetWidth] = useState(
		() => window.innerWidth * initialWidthRatio,
	);
	const isResizing = useRef(false);

	const handleMouseDown = useCallback((_: React.MouseEvent) => {
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
	}, []);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			const newWidth = window.innerWidth - e.clientX;
			if (newWidth >= minWidth && newWidth <= window.innerWidth * 0.95) {
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
	}, [minWidth]);

	return { sheetWidth, handleMouseDown };
}

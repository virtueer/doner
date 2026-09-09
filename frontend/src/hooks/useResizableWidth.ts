import { useCallback, useEffect, useRef, useState } from "react";

export function useResizableWidth({
	initial,
	min,
	max,
}: {
	initial: number;
	min: number;
	max: number;
}) {
	const [width, setWidth] = useState(() => window.innerWidth * initial);
	const isResizing = useRef(false);

	const startResize = useCallback(() => {
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
	}, []);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			const next = window.innerWidth - e.clientX;
			if (next >= min && next <= window.innerWidth * max) setWidth(next);
		};
		const onMouseUp = () => {
			if (!isResizing.current) return;
			isResizing.current = false;
			document.body.style.cursor = "default";
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			document.body.style.cursor = "default";
		};
	}, [min, max]);

	return { width, startResize };
}

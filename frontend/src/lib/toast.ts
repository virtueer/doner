export type ToastType = "success" | "error" | "info";

export type Toast = {
	id: string;
	message: string;
	type: ToastType;
};

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

export const toast = (message: string, type: ToastType = "info") => {
	const id = Math.random().toString(36).substring(2, 9);
	toasts = [...toasts, { id, message, type }];
	listeners.forEach((l) => {
		l([...toasts]);
	});

	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
		listeners.forEach((l) => {
			l([...toasts]);
		});
	}, 4000);
};

export const subscribeToToasts = (listener: (toasts: Toast[]) => void) => {
	listeners.push(listener);
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
};

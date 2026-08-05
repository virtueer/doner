import { AlertCircle, CheckCircle2, InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribeToToasts, type Toast } from "@/lib/toast";

export function Toaster() {
	const [toasts, setToasts] = useState<Toast[]>([]);
	useEffect(() => subscribeToToasts(setToasts), []);

	return (
		<div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl text-sm min-w-[280px] animate-in slide-in-from-right-8 fade-in duration-300 border ${
						t.type === "error"
							? "bg-red-500/10 border-red-500/20 text-red-500 backdrop-blur-md"
							: t.type === "success"
								? "bg-green-500/10 border-green-500/20 text-green-500 backdrop-blur-md"
								: "bg-[#2a2a2a]/90 border-white/10 text-white/90 backdrop-blur-md"
					}`}
				>
					{t.type === "error" ? (
						<AlertCircle className="h-5 w-5 shrink-0" />
					) : t.type === "success" ? (
						<CheckCircle2 className="h-5 w-5 shrink-0" />
					) : (
						<InfoIcon className="h-5 w-5 shrink-0 text-blue-400" />
					)}
					<span className="font-medium">{t.message}</span>
				</div>
			))}
		</div>
	);
}

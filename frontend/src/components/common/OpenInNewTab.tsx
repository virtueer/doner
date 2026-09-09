import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function openAppTab(params: Record<string, string>) {
	const url = new URL(window.location.origin);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	window.open(url.toString(), "_blank");
}

export function OpenInNewTab({
	params,
	label = "Open in new tab",
}: {
	params: Record<string, string>;
	label?: string;
}) {
	return (
		<Button variant="ghost" size="sm" onClick={() => openAppTab(params)}>
			<ExternalLink />
			{label}
		</Button>
	);
}

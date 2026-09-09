import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface Link {
	title: string;
	url: string;
}

export function LinksTab({ containerId }: { containerId: string }) {
	const [links, setLinks] = useState<Link[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		setLoading(true);
		api
			.get(`/api/containers/${containerId}/links`)
			.then((res) => setLinks(res.data || []))
			.catch(console.error)
			.finally(() => setLoading(false));
	}, [containerId]);

	const updateLink = (index: number, patch: Partial<Link>) =>
		setLinks((prev) =>
			prev.map((link, i) => (i === index ? { ...link, ...patch } : link)),
		);

	const saveLinks = async () => {
		try {
			setLoading(true);
			await api.post(`/api/containers/${containerId}/links`, { links });
			toast("Links saved", "success");
		} catch (err) {
			console.error("Failed to save links:", err);
			toast("Failed to save links", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex-1 overflow-y-auto p-6">
			<header className="mb-6">
				<h3 className="text-lg font-medium">Container Links</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Add quick access URLs or ports for this container.
				</p>
			</header>

			{loading && links.length === 0 ? (
				<p className="animate-pulse text-sm text-muted-foreground">
					Loading links...
				</p>
			) : (
				<div className="space-y-4">
					{links.map((link, idx) => (
						<div
							key={idx}
							className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
						>
							<div className="flex-1 space-y-2">
								<Input
									value={link.title}
									onChange={(e) => updateLink(idx, { title: e.target.value })}
									placeholder="Link title (e.g. Web UI)"
									className="h-9"
								/>
								<Input
									value={link.url}
									onChange={(e) => updateLink(idx, { url: e.target.value })}
									placeholder="URL (e.g. http://localhost:8080)"
									className="h-9 font-mono"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Button
									variant="ghost"
									size="icon-sm"
									title="Open link"
									disabled={!link.url}
									onClick={() => window.open(link.url, "_blank")}
								>
									<ExternalLink />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									title="Remove link"
									className="text-destructive hover:bg-destructive/10 hover:text-destructive"
									onClick={() =>
										setLinks((prev) => prev.filter((_, i) => i !== idx))
									}
								>
									<Trash2 />
								</Button>
							</div>
						</div>
					))}

					<div className="flex items-center justify-between gap-3 border-t border-border pt-4">
						<Button
							variant="outline"
							onClick={() => setLinks([...links, { title: "", url: "" }])}
						>
							<Plus />
							Add Link
						</Button>
						<Button onClick={saveLinks} disabled={loading}>
							{loading ? "Saving..." : "Save Links"}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

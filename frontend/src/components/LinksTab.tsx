import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function LinksTab({ containerId }: { containerId: string }) {
	const [links, setLinks] = useState<{ title: string; url: string }[]>([]);
	const [linksLoading, setLinksLoading] = useState(false);

	useEffect(() => {
		setLinksLoading(true);
		api
			.get(`/api/containers/${containerId}/links`)
			.then((res) => setLinks(res.data || []))
			.catch(console.error)
			.finally(() => setLinksLoading(false));
	}, [containerId]);

	const saveLinks = async (newLinks: { title: string; url: string }[]) => {
		try {
			setLinksLoading(true);
			await api.post(`/api/containers/${containerId}/links`, {
				links: newLinks,
			});
			setLinks(newLinks);
		} catch (err) {
			console.error("Failed to save links:", err);
		} finally {
			setLinksLoading(false);
		}
	};

	return (
		<div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#1e1e1e]">
			<div className="space-y-6">
				<div>
					<h3 className="text-lg font-medium text-white mb-2">
						Container Links
					</h3>
					<p className="text-sm text-white/50 mb-4">
						Add quick access URLs or ports for this container.
					</p>
				</div>

				{linksLoading ? (
					<div className="text-white/50 text-sm animate-pulse">
						Loading links...
					</div>
				) : (
					<div className="space-y-4">
						{links.map((link, idx) => (
							<div
								key={idx}
								className="flex gap-3 items-start p-3 bg-white/5 border border-white/10 rounded-lg"
							>
								<div className="flex-1 space-y-2">
									<input
										type="text"
										value={link.title}
										onChange={(e) => {
											const newLinks = [...links];
											newLinks[idx].title = e.target.value;
											setLinks(newLinks);
										}}
										placeholder="Link Title (e.g. Web UI)"
										className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
									/>
									<input
										type="text"
										value={link.url}
										onChange={(e) => {
											const newLinks = [...links];
											newLinks[idx].url = e.target.value;
											setLinks(newLinks);
										}}
										placeholder="URL (e.g. http://localhost:8080)"
										className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary font-mono"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<button
										onClick={() => {
											if (link.url) window.open(link.url, "_blank");
										}}
										className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded"
										title="Open Link"
									>
										<ExternalLink className="w-4 h-4" />
									</button>
									<button
										onClick={() => {
											const newLinks = links.filter((_, i) => i !== idx);
											setLinks(newLinks);
										}}
										className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded"
										title="Remove Link"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
						<button
							onClick={() => setLinks([...links, { title: "", url: "" }])}
							className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md border border-blue-500/20 transition-colors w-fit"
						>
							<Plus className="w-4 h-4" />
							Add Link
						</button>

						<div className="pt-4 border-t border-white/10 flex justify-end">
							<button
								onClick={() => saveLinks(links)}
								className="px-4 py-2 bg-blue-500/10 text-blue-400 text-sm font-medium rounded-md hover:bg-blue-500/20 transition-colors"
							>
								Save Links
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

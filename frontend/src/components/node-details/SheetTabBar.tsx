import { Folder, Link, Play, Search, Terminal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabType = "inspect" | "logs" | "attach" | "files" | "links";

interface SheetTabBarProps {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
	isContainer: boolean;
	isVolume: boolean;
}

export function SheetTabBar({
	activeTab,
	setActiveTab,
	isContainer,
	isVolume,
}: SheetTabBarProps) {
	return (
		<div className="mt-4 border-b border-white/5 pb-2">
			<Tabs
				value={activeTab}
				onValueChange={(val) => setActiveTab(val as TabType)}
			>
				<TabsList className="bg-white/5 border border-white/10">
					<TabsTrigger value="inspect" className="gap-1.5 text-xs">
						<Search className="h-3.5 w-3.5" />
						Inspect
					</TabsTrigger>
					{isContainer && (
						<>
							<TabsTrigger value="logs" className="gap-1.5 text-xs">
								<Terminal className="h-3.5 w-3.5" />
								Logs
							</TabsTrigger>
							<TabsTrigger value="attach" className="gap-1.5 text-xs">
								<Play className="h-3.5 w-3.5" />
								Attach
							</TabsTrigger>
						</>
					)}
					{(isContainer || isVolume) && (
						<TabsTrigger value="files" className="gap-1.5 text-xs">
							<Folder className="h-3.5 w-3.5" />
							Files
						</TabsTrigger>
					)}
					{isContainer && (
						<TabsTrigger value="links" className="gap-1.5 text-xs">
							<Link className="h-3.5 w-3.5" />
							Links
						</TabsTrigger>
					)}
				</TabsList>
			</Tabs>
		</div>
	);
}

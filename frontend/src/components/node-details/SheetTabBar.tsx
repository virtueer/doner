import type { LucideIcon } from "lucide-react";
import { Folder, Link, Play, Search, Terminal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabType = "inspect" | "logs" | "attach" | "files" | "links";

const TABS: {
	value: TabType;
	label: string;
	icon: LucideIcon;
	show: (ctx: { isContainer: boolean; isVolume: boolean }) => boolean;
}[] = [
	{ value: "inspect", label: "Inspect", icon: Search, show: () => true },
	{ value: "logs", label: "Logs", icon: Terminal, show: (c) => c.isContainer },
	{ value: "attach", label: "Attach", icon: Play, show: (c) => c.isContainer },
	{
		value: "files",
		label: "Files",
		icon: Folder,
		show: (c) => c.isContainer || c.isVolume,
	},
	{ value: "links", label: "Links", icon: Link, show: (c) => c.isContainer },
];

export function SheetTabBar({
	activeTab,
	setActiveTab,
	isContainer,
	isVolume,
}: {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
	isContainer: boolean;
	isVolume: boolean;
}) {
	return (
		<Tabs
			value={activeTab}
			onValueChange={(value) => setActiveTab(value as TabType)}
			className="mt-4"
		>
			<TabsList variant="line" className="h-9">
				{TABS.filter((tab) => tab.show({ isContainer, isVolume })).map(
					({ value, label, icon: Icon }) => (
						<TabsTrigger key={value} value={value} className="px-3">
							<Icon />
							{label}
						</TabsTrigger>
					),
				)}
			</TabsList>
		</Tabs>
	);
}

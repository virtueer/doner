import type * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function SimpleSelect({
	value,
	onValueChange,
	options,
	disabled,
	size = "sm",
	className,
	...props
}: {
	value: string;
	onValueChange: (value: string) => void;
	options: { value: string; label: string }[];
	disabled?: boolean;
	size?: "sm" | "default";
	className?: string;
} & Pick<React.AriaAttributes, "aria-label">) {
	return (
		<Select
			value={value}
			onValueChange={(next) => onValueChange(next as string)}
			items={options}
			disabled={disabled}
		>
			<SelectTrigger size={size} className={className} {...props}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export const toOptions = (values: string[]) =>
	values.map((value) => ({ value, label: value }));

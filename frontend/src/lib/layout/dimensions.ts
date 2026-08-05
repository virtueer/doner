/**
 * Returns approximate [width, height] for a given node type.
 */
export function getNodeDimensions(type?: string): [number, number] {
	switch (type) {
		case "containerNode":
			return [310, 120];
		case "networkNode":
			return [280, 100];
		case "volumeNode":
			return [260, 110];
		case "imageNode":
			return [250, 130];
		default:
			return [280, 120];
	}
}

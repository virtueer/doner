import * as posix from "node:path/posix";

/**
 * Collapses a client-supplied path to a normalised relative form.
 *
 * Normalising against "/" makes leading `..` segments disappear rather than
 * escape, so the result can never climb above the directory it is joined to.
 */
export function normalizeRelative(requestedPath = ""): string {
	return posix.normalize(`/${requestedPath}`).replace(/^\/+/, "");
}

export function resolveInsideRoot(root: string, requestedPath = ""): string {
	const relative = normalizeRelative(requestedPath);
	return relative ? `${root}/${relative}` : root;
}

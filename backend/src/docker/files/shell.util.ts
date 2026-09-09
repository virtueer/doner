/**
 * Builds an `sh -c` argv where user data travels as positional arguments
 * ($1, $2, ...) rather than being interpolated into the script text.
 */
export function shellCommand(script: string, ...args: string[]): string[] {
	return ["sh", "-c", script, "sh", ...args];
}

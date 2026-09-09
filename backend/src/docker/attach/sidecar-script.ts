/**
 * Runs inside the sidecar, which shares the target's PID namespace. It mirrors
 * the target's PATH and environment onto the sidecar so familiar commands and
 * variables resolve, then drops into an interactive shell at the target's root.
 */
export function buildSidecarScript(image: string, shell: string): string {
	return `#!/bin/sh
TARGET_PID=1

if [ ! -d "/proc/$TARGET_PID" ]; then
    echo "❌ Error: Target PID $TARGET_PID not found."
    exit 1
fi

TARGET_PATH=$(tr '\\0' '\\n' < /proc/$TARGET_PID/environ 2>/dev/null | grep '^PATH=' | cut -d= -f2)

if [ -n "$TARGET_PATH" ]; then
    NEW_PATHS=""
    OLD_IFS=$IFS
    IFS=":"
    for path in $TARGET_PATH; do
        if [ -n "$path" ]; then
            NEW_PATHS="$NEW_PATHS/proc/$TARGET_PID/root$path:"
        fi
    done
    IFS=$OLD_IFS

    export PATH="\${NEW_PATHS}\${PATH}"
fi

for env in $(tr '\\0' '\\n' < /proc/$TARGET_PID/environ 2>/dev/null); do
    key=$(echo "$env" | cut -d= -f1)
    val=$(echo "$env" | cut -d= -f2-)

    if [ "$key" != "PATH" ] && [ "$key" != "HOSTNAME" ] && [ "$key" != "SHLVL" ]; then
        if ! printenv "$key" >/dev/null 2>&1; then
            export "$key=$val"
        fi
    fi
done

if [ -d "/proc/$TARGET_PID/root" ]; then
    cd "/proc/$TARGET_PID/root" || true
fi

TARGET_SHELL="${shell}"

if ! command -v "$TARGET_SHELL" >/dev/null 2>&1 && [ ! -x "$TARGET_SHELL" ]; then
    TARGET_SHELL="sh"
fi

echo "🚀 Sidecar environment ready (${image} - Merged target container's PATH and ENV)"

exec "$TARGET_SHELL" -i
`;
}

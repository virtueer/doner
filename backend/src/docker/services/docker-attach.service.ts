import { Injectable } from "@nestjs/common";
import { DockerClientService } from "./docker-client.service";

@Injectable()
export class DockerAttachService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async attachToContainer(containerId: string, shell: string) {
		const container = this.dockerClient.docker.getContainer(containerId);

		const exec = await container.exec({
			AttachStdin: true,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
			Cmd: [shell],
		});

		const stream = await exec.start({
			hijack: true,
			stdin: true,
			Tty: true,
		});

		return stream;
	}

	async attachSidecar(targetContainerId: string) {
		const docker = this.dockerClient.docker;
		const name = `doner-sidecar-${targetContainerId.substring(0, 12)}-${Math.random().toString(36).substring(7)}`;

		const sidecar = await docker.createContainer({
			Image: "alpine",
			Cmd: ["sleep", "infinity"],
			name,
			Labels: { "doner.internal": "true", "doner.sidecar": "true" },
			HostConfig: {
				AutoRemove: true,
				Privileged: true,
				PidMode: `container:${targetContainerId}`,
				NetworkMode: `container:${targetContainerId}`,
			},
		});

		await sidecar.start();

		const activeHelpers = this.dockerClient.getActiveHelpers();
		activeHelpers.set(sidecar.id, {
			containerId: sidecar.id,
			lastUsed: Date.now(),
			type: "sidecar",
		});

		const script = `#!/bin/sh
TARGET_PID=1

if [ ! -d "/proc/$TARGET_PID" ]; then
    echo "❌ Error: Target PID $TARGET_PID not found."
    exit 1
fi

TARGET_PATH=$(strings /proc/$TARGET_PID/environ | grep '^PATH=' | cut -d= -f2)

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

for env in $(strings /proc/$TARGET_PID/environ); do
    key=$(echo "$env" | cut -d= -f1)
    val=$(echo "$env" | cut -d= -f2-)
    
    if [ "$key" != "PATH" ] && [ "$key" != "HOSTNAME" ] && [ "$key" != "SHLVL" ]; then
        if ! printenv "$key" >/dev/null 2>&1; then
            export "$key=$val"
        fi
    fi
done

echo "🚀 Sidecar environment ready (Merged target container's PATH and ENV)"

exec sh -i
`;

		const exec = await sidecar.exec({
			AttachStdin: true,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
			Cmd: [
				"sh",
				"-c",
				`echo '${Buffer.from(script).toString("base64")}' | base64 -d > /tmp/debug.sh && chmod +x /tmp/debug.sh && exec /tmp/debug.sh`,
			],
		});

		const stream = await exec.start({
			hijack: true,
			stdin: true,
			Tty: true,
		});

		stream.on("data", () => {
			const helper = activeHelpers.get(sidecar.id);
			if (helper) helper.lastUsed = Date.now();
		});

		const cleanup = async () => {
			try {
				await sidecar.stop({ t: 1 }).catch(() => {});
				await sidecar.remove({ force: true }).catch(() => {});
			} catch (_e) {}
			activeHelpers.delete(sidecar.id);
		};
		stream.on("end", cleanup);
		stream.on("close", cleanup);
		stream.on("error", cleanup);

		return stream;
	}
}

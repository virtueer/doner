const Docker = require('dockerode');
const stream = require('stream');
const docker = new Docker();
async function test() {
  const c = await docker.createContainer({Image: 'alpine', Cmd: ['sleep', '100']});
  await c.start();
  let output = '';
  const outStream = new stream.Writable({ write(chunk, e, cb) { output += chunk.toString(); cb(); } });
  await docker.run('alpine', ['ls', '/proc/1/root'], outStream, {
    HostConfig: { PidMode: `container:${c.id}`, Privileged: true, AutoRemove: true }
  });
  console.log(output.substring(0, 50));
  await c.stop();
  await c.remove();
}
test().catch(console.error);

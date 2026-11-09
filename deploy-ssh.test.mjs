import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import { checkSsh, probeSsh } from './scripts/check-deploy-ssh.mjs';

async function server(t, handler) {
  const sockets = new Set();
  const listener = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    handler(socket);
  });
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    for (const socket of sockets) socket.destroy();
    return new Promise(resolve => listener.close(resolve));
  });
  return { host: '127.0.0.1', port: listener.address().port, timeoutMs: 1000 };
}

test('SSH check accepts fragmented identification and sends no credentials', async t => {
  let received = 0;
  const target = await server(t, socket => {
    socket.on('data', data => { received += data.length; });
    socket.write('Maintenance notice\r\nSSH-2.0-');
    setImmediate(() => socket.write('OpenSSH_9.6\r\n'));
  });
  await checkSsh({ ...target, log() {} });
  assert.equal(received, 0);
});

test('an open port without an SSH banner times out', async t => {
  const target = await server(t, socket => socket.write('HTTP/1.1 200 OK\r\n'));
  await assert.rejects(probeSsh({ ...target, timeoutMs: 30 }), { code: 'ETIMEDOUT' });
});

test('a connection closed before its SSH banner fails', async t => {
  const target = await server(t, socket => socket.end());
  await assert.rejects(probeSsh(target), { code: 'ENOBANNER' });
});

test('transient failures retry only the read-only probe', async t => {
  let connections = 0;
  const target = await server(t, socket => {
    connections++;
    if (connections === 1) socket.end();
    else socket.write('SSH-2.0-OpenSSH\r\n');
  });
  await checkSsh({ ...target, retryMs: 0, log() {} });
  assert.equal(connections, 2);
});

test('persistent failures are bounded and omit origin addresses', async t => {
  let connections = 0;
  const logs = [];
  const target = await server(t, socket => { connections++; socket.end(); });
  await assert.rejects(checkSsh({ ...target, retryMs: 0, log: line => logs.push(line) }), /No deployment commands ran/);
  assert.equal(connections, 3);
  assert.equal(logs.length, 3);
  assert.ok(logs.every(line => !line.includes(target.host)));
});

test('missing host and invalid ports fail before connecting', async () => {
  for (const port of ['0', '65536', '22x', '']) {
    await assert.rejects(checkSsh({ host: '127.0.0.1', port }), /SERVER_PORT/);
  }
  await assert.rejects(checkSsh({ host: '' }), /SERVER_HOST/);
});

import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

// Read only: no credentials are sent and no remote commands are executed.
export function probeSsh({ host, port, timeoutMs = 10_000 }) {
  return new Promise((resolve, reject) => {
    let banner = '';
    const socket = net.createConnection({ host, port });
    // Bound the entire probe, including DNS resolution and banner receipt.
    const timer = setTimeout(() => finish(Object.assign(new Error('SSH probe timed out'), { code: 'ETIMEDOUT' })), timeoutMs);
    function finish(error) {
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve();
    }
    socket.on('error', finish);
    socket.on('end', () => finish(Object.assign(new Error('SSH banner was not received'), { code: 'ENOBANNER' })));
    socket.on('data', chunk => {
      banner += chunk.toString('ascii');
      // SSH servers may send informational lines before their identification.
      if (/(?:^|\r?\n)SSH-2\.0-[^\r\n]+\r?\n/.test(banner)) finish();
      else if (banner.length > 8192) finish(Object.assign(new Error('Invalid SSH banner'), { code: 'ENOBANNER' }));
    });
  });
}

export async function checkSsh({ host, port = '22', attempts = 3, retryMs = 5000, timeoutMs, log = console.log }) {
  if (!host?.trim() || /[\s,]/.test(host.trim())) throw new Error('SERVER_HOST must contain one hostname or IP address');
  if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error('SERVER_PORT must be an integer between 1 and 65535');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await probeSsh({ host: host.trim(), port: Number(port), timeoutMs });
      log(`SSH network check passed on attempt ${attempt}/${attempts}; no credentials sent.`);
      return;
    } catch (error) {
      // Do not print DNS answers or socket errors containing the origin address.
      log(`SSH network check ${attempt}/${attempts} failed: ${error.code || 'ECONNECTION'}.`);
      if (attempt === attempts) throw new Error('SSH is unreachable before authentication. Check SERVER_HOST/SERVER_PORT, VPS nftables/sshguard and the hosting firewall or network route. No deployment commands ran.');
      await delay(retryMs);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkSsh({ host: process.env.SSH_HOST, port: process.env.SSH_PORT || '22' }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

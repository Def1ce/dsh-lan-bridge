#!/usr/bin/env node
// dsh-lan-bridge — serve any local web app on the LAN with a
// crypto.randomUUID polyfill injected, so phones (including older iOS)
// can use the app over plain HTTP. No certs, no HTTPS, no public tunnels.
// Zero runtime dependencies. Node >= 18.
'use strict';

const http = require('http');

// ---------------------------------------------------------------- config ---

function parseArgs(argv) {
  const args = { backend: 'http://127.0.0.1:3080', httpPort: 8088, host: '0.0.0.0' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--backend') args.backend = next();
    else if (a === '--http-port') args.httpPort = Number(next());
    else if (a === '--host') args.host = next();
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`dsh-lan-bridge: unknown option ${a}`); printHelp(); process.exit(1); }
  }
  if (!/^https?:\/\//.test(args.backend)) args.backend = 'http://' + args.backend;
  const u = new URL(args.backend);
  args.backendHost = u.hostname;
  args.backendPort = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  return args;
}

function printHelp() {
  console.log(`dsh-lan-bridge - LAN bridge that injects a crypto.randomUUID polyfill

USAGE
  dsh-lan-bridge [options]

OPTIONS
  --backend <url>     backend to proxy (default http://127.0.0.1:3080)
  --http-port <n>     port to listen on (default 8088)
  --host <addr>       bind address (default 0.0.0.0)
  --help, -h          show this help

EXAMPLES
  dsh-lan-bridge                              # :8088 -> 127.0.0.1:3080
  dsh-lan-bridge --backend :3000 --http-port 8090
`);
}

// ------------------------------------------------------------ polyfill -----

// crypto.randomUUID exists only in secure contexts (HTTPS/localhost) and on
// browsers newer than Safari/iOS 15.4. getRandomValues exists everywhere.
const POLYFILL = '<script>(function(){if(typeof crypto==="object"&&crypto&&!crypto.randomUUID&&crypto.getRandomValues){crypto.randomUUID=function(){var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h="";for(var i=0;i<16;i++){h+=(b[i]<16?"0":"")+b[i].toString(16);if(i===3||i===5||i===7||i===9)h+="-";}return h;};}})();</script>';

// -------------------------------------------------------------- proxy -------

function makeHandler({ backendHost, backendPort }) {
  return function handle(req, res) {
    const proxy = http.request({
      host: backendHost, port: backendPort, path: req.url, method: req.method, headers: req.headers,
    }, (pres) => {
      const ct = String(pres.headers['content-type'] || '');
      if (ct.includes('text/html')) {
        const chunks = [];
        pres.on('data', (c) => chunks.push(c));
        pres.on('end', () => {
          let html = Buffer.concat(chunks).toString('utf8');
          if (html.includes('</head>')) html = html.replace('</head>', POLYFILL + '</head>');
          else html = POLYFILL + html;
          const out = Buffer.from(html, 'utf8');
          const headers = Object.assign({}, pres.headers);
          delete headers['transfer-encoding'];
          delete headers['content-encoding'];
          delete headers['content-length'];
          headers['content-length'] = String(out.length);
          res.writeHead(pres.statusCode, headers);
          res.end(out);
        });
        pres.on('error', () => { try { res.destroy(); } catch (_) {} });
      } else {
        res.writeHead(pres.statusCode, pres.headers);
        pres.pipe(res);
      }
    });
    proxy.on('error', (e) => {
      try { res.writeHead(502, { 'content-type': 'text/plain' }); res.end('proxy error: ' + e.message); } catch (_) {}
    });
    req.pipe(proxy);
  };
}

function makeUpgrader({ backendHost, backendPort }) {
  return function upgrade(req, socket, head) {
    const proxy = http.request({
      host: backendHost, port: backendPort, path: req.url, method: req.method, headers: req.headers,
    });
    proxy.on('upgrade', (pres, psocket) => {
      try {
        socket.write('HTTP/1.1 101 Switching Protocols\r\n');
        for (const [k, v] of Object.entries(pres.headers)) {
          if (Array.isArray(v)) for (const x of v) socket.write(`${k}: ${x}\r\n`);
          else socket.write(`${k}: ${v}\r\n`);
        }
        socket.write('\r\n');
        if (head && head.length) psocket.write(head);
        psocket.pipe(socket);
        socket.pipe(psocket);
      } catch (_) { socket.destroy(); psocket.destroy(); }
      socket.on('error', () => psocket.destroy());
      psocket.on('error', () => socket.destroy());
    });
    proxy.on('error', () => { try { socket.destroy(); } catch (_) {} });
    proxy.end();
  };
}

// ----------------------------------------------------------------- main -----

function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = http.createServer(makeHandler({ backendHost: args.backendHost, backendPort: args.backendPort }));
  server.on('upgrade', makeUpgrader({ backendHost: args.backendHost, backendPort: args.backendPort }));
  server.listen(args.httpPort, args.host, () => {
    console.log(`dsh-lan-bridge: http://<lan-ip>:${args.httpPort} -> ${args.backend}`);
    console.log('dsh-lan-bridge: ready. Open the URL from a phone on the same network (no cert needed).');
  });
}

main();

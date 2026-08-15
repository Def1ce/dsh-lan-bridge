// dsh-lan-bridge — DeepSeek Harness (dsh) plugin half.
//
// The dsh web client calls crypto.randomUUID() for RPC/message ids, but that
// function only exists in a secure context (HTTPS/localhost) and on browsers
// newer than Safari/iOS 15.4. Phones hitting the harness over plain HTTP
// therefore break with "crypto.randomUUID is not a function", and iOS Safari
// hard-blocks the self-signed-cert HTTPS workaround.
//
// This plugin fixes it at the source: it registers an index.html transform on
// the dsh web server that injects a tiny crypto.randomUUID polyfill (built on
// crypto.getRandomValues, which exists everywhere) before the app scripts
// run. Once mounted, the harness serves the polyfilled page on its own
// 3080 port — phones on the same LAN can use the UI over plain HTTP with
// zero certificates, zero extra processes, any browser, any iOS version.
//
// Mounted via the cordis.patch.yml row declared by package.json's
// dsh.bundle manifest (same mechanism as @liustack/modlens).

export const name = 'dsh-lan-bridge'

// crypto.randomUUID polyfill: getRandomValues works in every context/browser.
const POLYFILL =
  '<script>(function(){if(typeof crypto==="object"&&crypto&&!crypto.randomUUID&&crypto.getRandomValues){crypto.randomUUID=function(){var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h="";for(var i=0;i<16;i++){h+=(b[i]<16?"0":"")+b[i].toString(16);if(i===3||i===5||i===7||i===9)h+="-";}return h;};}})();</script>'

function transform(html) {
  if (typeof html !== 'string' || html.includes('crypto.randomUUID=function')) return html
  if (html.includes('</head>')) return html.replace('</head>', POLYFILL + '</head>')
  return POLYFILL + html
}

export function apply(ctx) {
  // webServer only exists under the web profile. Use a scoped ctx.inject so
  // the tap registers when the service appears and never waits where it does
  // not (headless stays untouched).
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (scope) => {
    try {
      const disposer = scope.webServer.tapIndex(transform)
      // Clean up the tap if this plugin is ever stopped/updated.
      ctx.on('dispose', () => {
        try { disposer() } catch (_) {}
      })
      console.log('[dsh-lan-bridge] crypto.randomUUID polyfill tap installed')
    } catch (error) {
      console.error(`[dsh-lan-bridge] polyfill tap failed: ${error}`)
    }
  })
}

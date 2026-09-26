/**
 * Host half of dsh-sidebar-footer-stack.
 *
 * The plugin's real work is browser-side CSS. This half only exists so the row
 * has a mountable module, plus one diagnostic route: the browser half POSTs the
 * DOM facts it observes there, which is the only way to see the GUI's DOM from
 * outside the app. Nothing here may break host boot - every step is guarded.
 */
import { appendFile, mkdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const ROUTE = '/sidebar-footer-stack/probe';
const LOG = join(homedir(), '.dsh', 'sidebar-footer-stack-probe.ndjson');
/** Diagnostics are bounded: the file never grows past this. */
const MAX_LOG_BYTES = 1024 * 1024;

async function record(text) {
  try {
    await mkdir(dirname(LOG), { recursive: true });
    const existing = await stat(LOG).catch(() => null);
    if (existing !== null && existing.size > MAX_LOG_BYTES) return;
    await appendFile(LOG, text + '\n', 'utf8');
  } catch (error) {
    void error;
  }
}

export function apply(ctx) {
  try {
    ctx.inject(['webServer'], (webCtx) => {
      webCtx.effect(() => webCtx.webServer.register({
        kind: 'exact',
        path: ROUTE,
        handler: (request, response) => {
          const chunks = [];
          request.on('data', (chunk) => chunks.push(chunk));
          request.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8').slice(0, 40000);
            void record(JSON.stringify({ at: new Date().toISOString(), body }));
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end('{"ok":true}');
          });
          request.on('error', () => { try { response.end(); } catch (error) { void error; } });
        }
      }), 'dsh-sidebar-footer-stack: probe route');
    });
  } catch (error) {
    void error;
  }
}

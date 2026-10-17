// Cloudflare Worker: serves the game (static assets) and online game rooms.
//   POST /api/rooms            -> { code }   create a room
//   GET  /api/rooms/:code      -> { exists, phase, seats }
//   GET  /api/rooms/:code/ws   -> WebSocket into the room's Durable Object
import { GameRoom } from './room.js';

export { GameRoom };

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O to avoid confusion
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname === '/api/health') return json({ ok: true });

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch(`https://room/create?code=${code}`, { method: 'POST' });
        if (res.status === 200) return json({ code });
      }
      return json({ error: 'Could not create a room, please try again' }, 503);
    }

    const m = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})(\/ws)?$/);
    if (m) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      if (m[2]) {
        if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'Expected WebSocket' }, 426);
        return stub.fetch(request);
      }
      return stub.fetch(`https://room/info?code=${m[1]}`);
    }
    return json({ error: 'Not found' }, 404);
  },
};

// WebSocket client for online rooms. Reconnects automatically (phones drop
// connections when the screen locks) and re-announces itself on every connect.
export function clientId() {
  let id = null;
  try { id = localStorage.getItem('carc-client-id'); } catch { /* private mode */ }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g, '').slice(0, 20);
    try { localStorage.setItem('carc-client-id', id); } catch { /* ignore */ }
  }
  return id;
}

export async function createRoom() {
  const res = await fetch('/api/rooms', { method: 'POST' });
  if (!res.ok) throw new Error(res.status === 404 ? 'Online play needs the Cloudflare Worker version of the app' : 'Could not create a game');
  return (await res.json()).code;
}

export async function roomInfo(code) {
  const res = await fetch(`/api/rooms/${code}`);
  if (!res.ok) throw new Error('Online play is not available on this server');
  return res.json();
}

export class Net {
  constructor(code, name, handlers) {
    this.code = code;
    this.name = name;
    this.id = clientId();
    this.handlers = handlers;
    this.ws = null;
    this.closed = false;
    this.retry = 0;
    this.queue = [];
    this.onVis = () => { if (!document.hidden && !this.isOpen()) this.connect(); };
    document.addEventListener('visibilitychange', this.onVis);
    window.addEventListener('online', this.onVis);
    this.connect();
  }

  isOpen() { return this.ws && this.ws.readyState === WebSocket.OPEN; }

  connect() {
    if (this.closed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/rooms/${this.code}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ type: 'hello', clientId: this.id, name: this.name }));
      const q = this.queue; this.queue = [];
      for (const m of q) ws.send(JSON.stringify(m));
      clearInterval(this.pinger);
      this.pinger = setInterval(() => { if (this.isOpen()) ws.send('{"type":"ping"}'); }, 25000);
      this.handlers.onStatus?.('online');
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'pong') return;
      this.handlers.onMessage?.(msg);
    };
    ws.onclose = (e) => {
      clearInterval(this.pinger);
      if (this.closed) return;
      this.handlers.onStatus?.('offline');
      if (e.code === 1008 || e.code === 4404) { this.handlers.onMessage?.({ type: 'error', error: 'That game does not exist' }); return; }
      const delay = Math.min(8000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    };
    ws.onerror = () => { /* onclose handles retries */ };
  }

  send(msg) {
    if (this.isOpen()) this.ws.send(JSON.stringify(msg));
    else { this.queue.push(msg); this.connect(); }
  }

  close() {
    this.closed = true;
    clearInterval(this.pinger);
    document.removeEventListener('visibilitychange', this.onVis);
    window.removeEventListener('online', this.onVis);
    try { this.ws?.close(); } catch { /* ignore */ }
  }
}

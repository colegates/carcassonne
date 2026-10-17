// One Durable Object per online game. It keeps the lobby (seats & options),
// the starting state and the ordered list of actions, and relays every action
// to all connected phones. Clients run the same deterministic rules engine and
// replay the actions, so the server stays tiny and cheap.
import { DurableObject } from 'cloudflare:workers';

const MAX_SEATS = 6;
const ROOM_TTL_MS = 1000 * 60 * 60 * 24 * 14; // forget rooms after two weeks idle

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = null;
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get('room')) || null;
    });
  }

  async save() {
    this.room.touched = Date.now();
    await this.ctx.storage.put('room', this.room);
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  async alarm() {
    if (this.room && Date.now() - (this.room.touched || 0) >= ROOM_TTL_MS - 1000) {
      await this.ctx.storage.deleteAll();
      this.room = null;
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/create') {
      if (this.room) return new Response('taken', { status: 409 });
      this.room = {
        code: url.searchParams.get('code'),
        created: Date.now(),
        hostId: null,
        phase: 'lobby',
        seats: [],
        options: {},
        clients: {},
        init: null,
        actions: [],
      };
      await this.save();
      return new Response('ok');
    }
    if (url.pathname === '/info') {
      if (!this.room) return Response.json({ exists: false });
      return Response.json({ exists: true, phase: this.room.phase, seats: this.room.seats.length });
    }
    // WebSocket upgrade
    if (!this.room) return new Response('No such room', { status: 404 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ clientId: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------- helpers ----------
  sockets() { return this.ctx.getWebSockets().filter((ws) => ws !== this.closing && ws.readyState === 1); }
  onlineIds() {
    const ids = new Set();
    for (const ws of this.sockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.clientId) ids.add(a.clientId);
    }
    return ids;
  }
  // The phone that runs the computer players: the host if online, otherwise
  // the earliest-joined phone that is still connected.
  botRunner(online = this.onlineIds()) {
    if (this.room.hostId && online.has(this.room.hostId)) return this.room.hostId;
    const order = Object.entries(this.room.clients).sort((a, b) => a[1].joined - b[1].joined);
    const found = order.find(([id]) => online.has(id));
    return found ? found[0] : null;
  }
  publicRoom() {
    const online = this.onlineIds();
    const r = this.room;
    return {
      code: r.code, phase: r.phase, hostId: r.hostId, seats: r.seats, options: r.options,
      clients: Object.fromEntries(Object.entries(r.clients).map(([id, c]) => [id, { name: c.name, online: online.has(id) }])),
      botRunner: this.botRunner(online),
      seq: r.actions.length,
    };
  }
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* socket gone */ } }
  broadcast(msg, except = null) {
    const s = JSON.stringify(msg);
    for (const ws of this.sockets()) if (ws !== except) { try { ws.send(s); } catch { /* ignore */ } }
  }
  broadcastRoom() { this.broadcast({ type: 'room', room: this.publicRoom() }); }

  // ---------- messages ----------
  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!this.room) { this.send(ws, { type: 'error', error: 'This game no longer exists' }); return; }
    const att = ws.deserializeAttachment() || {};
    const r = this.room;

    if (msg.type === 'ping') { this.send(ws, { type: 'pong' }); return; }

    if (msg.type === 'hello') {
      const clientId = String(msg.clientId || '').slice(0, 40);
      if (!clientId) return;
      ws.serializeAttachment({ clientId });
      const name = String(msg.name || 'Player').slice(0, 14);
      if (!r.clients[clientId]) r.clients[clientId] = { name, joined: Date.now() };
      else if (msg.name) r.clients[clientId].name = name;
      if (!r.hostId) r.hostId = clientId;
      await this.save();
      this.send(ws, {
        type: 'welcome', you: clientId, room: this.publicRoom(),
        init: r.init, actions: r.actions,
      });
      this.broadcastRoom();
      return;
    }

    const me = att.clientId;
    if (!me) { this.send(ws, { type: 'error', error: 'Say hello first' }); return; }
    const isHost = me === r.hostId;

    if (msg.type === 'lobby') {
      if (r.phase !== 'lobby') return;
      const seat = r.seats[msg.seat];
      const COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'grey'];
      const freeColor = (want) => (want && COLORS.includes(want) && !r.seats.some((x) => x.color === want)
        ? want : COLORS.find((c) => !r.seats.some((x) => x.color === c)));
      switch (msg.op) {
        case 'join': {
          // give this phone a seat (or another one with extra: true)
          if (r.seats.length >= MAX_SEATS) break;
          if (!msg.extra && r.seats.some((x) => x.owner === me)) break;
          r.seats.push({
            name: String(msg.name || r.clients[me]?.name || 'Player').slice(0, 14),
            color: freeColor(msg.color), kind: 'human', level: 'medium', owner: me,
          });
          break;
        }
        case 'leave':
          if (seat && seat.owner === me) r.seats.splice(msg.seat, 1);
          break;
        case 'add': {
          if (!isHost || r.seats.length >= MAX_SEATS) break;
          const s = msg.seatData || {};
          r.seats.push({
            name: String(s.name || 'Player').slice(0, 14), color: freeColor(s.color),
            kind: s.kind === 'ai' ? 'ai' : 'human', level: s.level || 'medium',
            owner: s.kind === 'ai' ? null : (s.mine ? me : null),
          });
          break;
        }
        case 'remove':
          if (isHost && seat) r.seats.splice(msg.seat, 1);
          break;
        case 'claim':
          if (seat && seat.kind === 'human' && !seat.owner) {
            seat.owner = me;
            if (msg.name) seat.name = String(msg.name).slice(0, 14);
            if (msg.color && !r.seats.some((x, i) => i !== msg.seat && x.color === msg.color)) seat.color = msg.color;
          }
          break;
        case 'release':
          if (seat && (seat.owner === me || isHost)) seat.owner = null;
          break;
        case 'update':
          if (seat && (seat.owner === me || (isHost && seat.kind === 'ai'))) {
            if (msg.name) seat.name = String(msg.name).slice(0, 14);
            if (msg.color && !r.seats.some((x, i) => i !== msg.seat && x.color === msg.color)) seat.color = msg.color;
            if (isHost && msg.level) seat.level = msg.level;
          }
          break;
        case 'kind':
          if (isHost && seat) {
            seat.kind = msg.kind === 'ai' ? 'ai' : 'human';
            if (msg.level) seat.level = msg.level;
            if (seat.kind === 'ai') seat.owner = null;
          }
          break;
        case 'options':
          if (isHost) r.options = msg.options || {};
          break;
        default:
          return;
      }
      await this.save();
      this.broadcastRoom();
      return;
    }

    if (msg.type === 'start') {
      if (!isHost || r.phase !== 'lobby' || !msg.init) return;
      r.phase = 'playing';
      r.init = msg.init;
      r.actions = [];
      await this.save();
      this.broadcast({ type: 'started', init: r.init, room: this.publicRoom() });
      return;
    }

    if (msg.type === 'action') {
      if (r.phase !== 'playing') return;
      if (msg.seq !== r.actions.length) {
        // someone else got there first: tell the sender to resync
        this.send(ws, { type: 'resync', init: r.init, actions: r.actions, room: this.publicRoom() });
        return;
      }
      r.actions.push(msg.action);
      if (msg.over) r.phase = 'over';
      await this.save();
      this.broadcast({ type: 'action', seq: msg.seq, action: msg.action, from: me });
      return;
    }

    if (msg.type === 'resync') {
      this.send(ws, { type: 'resync', init: r.init, actions: r.actions, room: this.publicRoom() });
      return;
    }

    if (msg.type === 'emote') {
      this.broadcast({ type: 'emote', from: me, emoji: String(msg.emoji || '').slice(0, 4) });
      return;
    }

    if (msg.type === 'rematch') {
      if (!isHost) return;
      r.phase = 'lobby'; r.init = null; r.actions = [];
      await this.save();
      this.broadcastRoom();
    }
  }

  async webSocketClose(ws) {
    this.closing = ws;
    try { ws.close(); } catch { /* already closed */ }
    if (this.room) this.broadcastRoom();
    this.closing = null;
  }

  async webSocketError(ws) {
    this.closing = ws;
    if (this.room) this.broadcastRoom();
    this.closing = null;
  }
}

import bedrock from 'bedrock-protocol';
import http from 'node:http';

const HOST = process.env.SERVER_HOST || 'localhost';
const PORT = parseInt(process.env.SERVER_PORT || '19132');
const USERNAME = process.env.BOT_USERNAME || 'AFK_Bot';
const JUMP_INTERVAL_MS = parseInt(process.env.JUMP_INTERVAL_MS || '4000');
const RECONNECT_DELAY_MS = parseInt(process.env.RECONNECT_DELAY_MS || '15000');
const OFFLINE = process.env.OFFLINE_MODE === 'true';
const HTTP_PORT = parseInt(process.env.PORT || '3000');

let reconnectAttempts = 0;
let shuttingDown = false;
let botStatus = 'connecting';
let botPosition = { x: 0, y: 0, z: 0 };

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function stripFormatting(text) {
  return String(text).replace(/§./g, '');
}

const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: botStatus, position: botPosition, server: `${HOST}:${PORT}`, username: USERNAME, reconnectAttempts }));
});

function connect() {
  if (shuttingDown) return;
  reconnectAttempts++;
  botStatus = 'connecting';
  log(`Connecting to ${HOST}:${PORT} as "${USERNAME}" (attempt ${reconnectAttempts})`);
  let client;
  try {
    client = bedrock.createClient({ host: HOST, port: PORT, username: USERNAME, offline: OFFLINE, connectTimeout: 30000 });
  } catch (e) { log(`Failed: ${e.message}`); scheduleReconnect(); return; }

  let spawned = false, jumpTimer = null, moveAngle = 0;

  function stopTimers() { if (jumpTimer) { clearInterval(jumpTimer); jumpTimer = null; } }

  function startAFK() {
    if (jumpTimer) return;
    log(`AFK loop started`);
    jumpTimer = setInterval(() => {
      if (!spawned) return;
      try {
        const id = BigInt(client.entityId ?? 1);
        client.queue('player_action', { runtime_id: id, action_id: 'jump', position: { x: 0, y: 0, z: 0 }, result_position: { x: 0, y: 0, z: 0 }, face: 0 });
        moveAngle = (moveAngle + 45) % 360;
        const rad = (moveAngle * Math.PI) / 180;
        client.queue('move_player', { runtime_id: id, position: { x: botPosition.x + Math.sin(rad) * 0.001, y: botPosition.y, z: botPosition.z + Math.cos(rad) * 0.001 }, pitch: 0, yaw: moveAngle, head_yaw: moveAngle, mode: 0, on_ground: true, riding_runtime_id: 0n, tick: 0n });
        log(`AFK tick (angle ${moveAngle}°)`);
      } catch (e) { log(`Tick error: ${e.message}`); }
    }, JUMP_INTERVAL_MS);
  }

  client.on('resource_packs_info', (p) => { log(`Packs (${p.texture_packs?.length ?? 0}) — accepting`); client.queue('resource_pack_client_response', { response_status: 'have_all_packs', resourcepackids: [] }); });
  client.on('resource_pack_stack', () => { log('Pack stack — completing'); client.queue('resource_pack_client_response', { response_status: 'completed', resourcepackids: [] }); });
  client.on('start_game', (p) => {
    const pos = p.player_position ?? { x: 0, y: 64, z: 0 };
    botPosition = { x: pos.x, y: pos.y, z: pos.z }; botStatus = 'in_game'; reconnectAttempts = 0;
    log(`Joined! Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
    try { client.queue('set_local_player_as_initialized', { runtime_entity_id: BigInt(p.runtime_entity_id ?? 1) }); } catch {}
    spawned = true; startAFK();
  });
  client.on('spawn', () => { if (!spawned) { spawned = true; botStatus = 'in_game'; reconnectAttempts = 0; startAFK(); } });
  client.on('play_status', (p) => log(`Play status: ${p.status}`));
  client.on('text', (p) => { const m = stripFormatting(p.message || ''); const s = stripFormatting(p.source_name || 'Server'); if (m) log(`[CHAT] <${s}> ${m}`); });
  client.on('disconnect', (p) => { log(`Disconnected: ${stripFormatting(p.message || '')}`); botStatus = 'disconnected'; spawned = false; stopTimers(); scheduleReconnect(); });
  client.on('kick', (p) => { log(`Kicked: ${stripFormatting(p.message || '')}`); botStatus = 'disconnected'; spawned = false; stopTimers(); scheduleReconnect(); });
  client.on('error', (e) => { log(`Error: ${e.message}`); botStatus = 'disconnected'; spawned = false; stopTimers(); scheduleReconnect(); });
  client.on('close', () => { log('Closed'); botStatus = 'disconnected'; spawned = false; stopTimers(); });
}

function scheduleReconnect() {
  if (shuttingDown) return;
  const delay = Math.min(RECONNECT_DELAY_MS * reconnectAttempts, 120000);
  log(`Reconnecting in ${delay / 1000}s...`);
  setTimeout(connect, delay);
}

process.on('SIGINT', () => { shuttingDown = true; process.exit(0); });
process.on('SIGTERM', () => { shuttingDown = true; process.exit(0); });

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  log(`Health check server on port ${HTTP_PORT}`);
  connect();
});

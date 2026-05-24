import bedrock from 'bedrock-protocol';

const HOST = process.env.SERVER_HOST || 'localhost';
const PORT = parseInt(process.env.SERVER_PORT || '19132');
const USERNAME = process.env.BOT_USERNAME || 'AFK_Bot';
const JUMP_INTERVAL_MS = parseInt(process.env.JUMP_INTERVAL_MS || '4000');
const RECONNECT_DELAY_MS = parseInt(process.env.RECONNECT_DELAY_MS || '15000');
const OFFLINE = process.env.OFFLINE_MODE === 'true';

let reconnectAttempts = 0;
let shuttingDown = false;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function stripFormatting(text) {
  return String(text).replace(/§./g, '');
}

function connect() {
  if (shuttingDown) return;

  reconnectAttempts++;
  log(`Connecting to ${HOST}:${PORT} as "${USERNAME}" (attempt ${reconnectAttempts})`);

  let client;
  try {
    client = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: OFFLINE,
      useNativeRaknet: false,
      connectTimeout: 30000,
    });
  } catch (e) {
    log(`Failed to create client: ${e.message}`);
    scheduleReconnect();
    return;
  }

  let spawned = false;
  let jumpTimer = null;
  let moveAngle = 0;

  function stopTimers() {
    if (jumpTimer) { clearInterval(jumpTimer); jumpTimer = null; }
  }

  function startAFK() {
    if (jumpTimer) return;
    log(`AFK loop started — jumping every ${JUMP_INTERVAL_MS}ms`);
    jumpTimer = setInterval(() => {
      if (!spawned) return;
      try {
        const entityId = BigInt(client.entityId ?? 1);

        client.queue('player_action', {
          runtime_id: entityId,
          action_id: 'jump',
          position: { x: 0, y: 0, z: 0 },
          result_position: { x: 0, y: 0, z: 0 },
          face: 0,
        });

        moveAngle = (moveAngle + 45) % 360;
        const rad = (moveAngle * Math.PI) / 180;
        client.queue('move_player', {
          runtime_id: entityId,
          position: { x: Math.sin(rad) * 0.001, y: 64, z: Math.cos(rad) * 0.001 },
          pitch: 0, yaw: moveAngle, head_yaw: moveAngle,
          mode: 0, on_ground: true,
          riding_runtime_id: 0n, tick: 0n,
        });

        log(`AFK tick — jumped (angle ${moveAngle}°)`);
      } catch (e) {
        log(`AFK tick error: ${e.message}`);
      }
    }, JUMP_INTERVAL_MS);
  }

  client.on('resource_packs_info', (packet) => {
    const count = packet.texture_packs?.length ?? 0;
    log(`Resource packs received (${count}) — accepting all`);
    client.queue('resource_pack_client_response', {
      response_status: 'have_all_packs',
      resourcepackids: [],
    });
  });

  client.on('resource_pack_stack', () => {
    log('Resource pack stack — completing handshake');
    client.queue('resource_pack_client_response', {
      response_status: 'completed',
      resourcepackids: [],
    });
  });

  client.on('start_game', (packet) => {
    const pos = packet.player_position ?? { x: 0, y: 64, z: 0 };
    log(`Joined world! Position: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
    reconnectAttempts = 0;

    try {
      client.queue('set_local_player_as_initialized', {
        runtime_entity_id: BigInt(packet.runtime_entity_id ?? 1),
      });
    } catch (e) {
      log(`set_local_player_as_initialized (non-fatal): ${e.message}`);
    }

    spawned = true;
    startAFK();
  });

  client.on('spawn', () => {
    log('Spawn event');
    if (!spawned) { spawned = true; reconnectAttempts = 0; startAFK(); }
  });

  client.on('play_status', (packet) => {
    log(`Play status: ${packet.status}`);
  });

  client.on('text', (packet) => {
    const msg = stripFormatting(packet.message || '');
    const src = stripFormatting(packet.source_name || 'Server');
    if (msg) log(`[CHAT] <${src}> ${msg}`);
  });

  client.on('disconnect', (packet) => {
    log(`Disconnected: ${stripFormatting(packet.message || 'no reason')}`);
    spawned = false; stopTimers(); scheduleReconnect();
  });

  client.on('kick', (packet) => {
    log(`Kicked: ${stripFormatting(packet.message || 'no reason')}`);
    spawned = false; stopTimers(); scheduleReconnect();
  });

  client.on('error', (err) => {
    log(`Error: ${err.message}`);
    spawned = false; stopTimers(); scheduleReconnect();
  });

  client.on('close', () => {
    log('Connection closed');
    spawned = false; stopTimers();
  });
}

function scheduleReconnect() {
  if (shuttingDown) return;
  const delay = Math.min(RECONNECT_DELAY_MS * reconnectAttempts, 120000);
  log(`Reconnecting in ${delay / 1000}s...`);
  setTimeout(connect, delay);
}

process.on('SIGINT', () => { log('Shutting down...'); shuttingDown = true; process.exit(0); });
process.on('SIGTERM', () => { shuttingDown = true; process.exit(0); });

connect();

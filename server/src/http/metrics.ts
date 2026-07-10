// In-process Prometheus gauges (mirrors WoG O-METRICS). Counts only — no hidden game state.
let activeRooms = 0;
let connectedPlayers = 0;

export function recordRoomOpened(): void {
  activeRooms++;
}

export function recordRoomClosed(): void {
  if (activeRooms > 0) activeRooms--;
}

export function recordPlayerConnected(): void {
  connectedPlayers++;
}

export function recordPlayerDisconnected(): void {
  if (connectedPlayers > 0) connectedPlayers--;
}

/** For test isolation only — not for production use. */
export function resetMetrics(): void {
  activeRooms = 0;
  connectedPlayers = 0;
}

/** Prometheus text exposition format (version 0.0.4). */
export function metricsText(): string {
  return [
    '# HELP boarded_active_rooms Number of live match rooms in process',
    '# TYPE boarded_active_rooms gauge',
    `boarded_active_rooms ${activeRooms}`,
    '# HELP boarded_connected_players Number of currently connected players',
    '# TYPE boarded_connected_players gauge',
    `boarded_connected_players ${connectedPlayers}`,
    '',
  ].join('\n');
}

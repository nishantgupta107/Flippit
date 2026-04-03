import type * as Party from "partykit/server";

/**
 * Flippit Multiplayer Server (PartyKit)
 * Based on Mojo Architecture: A thin relay server for game state synchronization.
 */
export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Basic presence logging
    console.log(
      `Connected: ${conn.id} to room ${this.party.id}`
    );

    // Protocol: Host should sync state to new players upon joining
    // For now, we trust the clients to handle the 'REQUEST_STATE_SYNC' flow
  }

  onMessage(message: string, sender: Party.Connection) {
    // Relay strategy: Full broadcast to everyone in the room except the sender
    // The server doesn't parse the message, just forwards it.
    this.party.broadcast(message, [sender.id]);
  }

  onClose(conn: Party.Connection) {
    console.log(`Disconnected: ${conn.id}`);
    
    // Broadcast a simple leave event so players know who left
    this.party.broadcast(JSON.stringify({
      type: "PLAYER_DISCONNECTED",
      senderId: conn.id,
      timestamp: Date.now()
    }), [conn.id]);
  }
}

Server satisfies Party.Worker;

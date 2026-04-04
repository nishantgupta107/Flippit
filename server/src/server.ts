import type * as Party from 'partykit/server';

/**
 * PartyKit server for Flippit multiplayer
 * Basic room handler with connection logging
 * @see DEV_PLAN.md §5.1
 */
export default class FlippitServer implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: false,
  };

  // Track connected players
  private players: Map<string, { id: string; connectedAt: number }> = new Map();

  constructor(readonly room: Party.Room) {
    console.log(`[Room ${room.id}] Server initialized`);
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): void {
    console.log(`[Room ${this.room.id}] Player connected: ${conn.id}`);

    this.players.set(conn.id, {
      id: conn.id,
      connectedAt: Date.now(),
    });

    // Broadcast player joined to all connections
    this.room.broadcast(
      JSON.stringify({
        type: 'PLAYER_JOINED',
        player: { id: conn.id },
        playerCount: this.players.size,
      }),
      [conn.id] // Exclude sender
    );

    // Send welcome to new player
    conn.send(
      JSON.stringify({
        type: 'WELCOME',
        playerId: conn.id,
        playerCount: this.players.size,
      })
    );
  }

  onClose(conn: Party.Connection): void {
    console.log(`[Room ${this.room.id}] Player disconnected: ${conn.id}`);

    this.players.delete(conn.id);

    // Broadcast player left
    this.room.broadcast(
      JSON.stringify({
        type: 'PLAYER_LEFT',
        playerId: conn.id,
        playerCount: this.players.size,
      })
    );
  }

  onMessage(message: string, sender: Party.Connection): void {
    console.log(`[Room ${this.room.id}] Message from ${sender.id}: ${message}`);

    try {
      const data = JSON.parse(message);

      // Echo message back to all clients (placeholder behavior)
      this.room.broadcast(
        JSON.stringify({
          type: 'ECHO',
          senderId: sender.id,
          data,
        })
      );
    } catch {
      // Invalid JSON, ignore
      console.warn(`[Room ${this.room.id}] Invalid message from ${sender.id}`);
    }
  }

  onRequest(req: Party.Request): Response | Promise<Response> {
    // Health check endpoint
    if (req.url.endsWith('/health')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          roomId: this.room.id,
          playerCount: this.players.size,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Not found', { status: 404 });
  }
}

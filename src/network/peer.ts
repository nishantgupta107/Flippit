import { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameState } from '../engine/types';

export type NetworkMessage =
  | { type: 'STATE_UPDATE'; state: GameState }
  | { type: 'ACTION'; action: 'HIT' | 'STAY'; playerId: string }
  | { type: 'PLAYER_JOINED'; playerId: string; name: string };

type MessageHandler = (msg: NetworkMessage) => void;

class NetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private isHost: boolean = true;
  private onMessageCallback: MessageHandler | null = null;

  initHost(
    onReady: (roomId: string) => void,
    onClientJoined?: (clientId: string, name: string) => void,
    onClientLeft?: (clientId: string) => void
  ) {
    this.isHost = true;
    // Generate a random 4-6 character room code
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Explicitly configure PeerJS with debugging enabled
    this.peer = new Peer(`flippit-${roomId}`, { debug: 2 });

    this.peer.on('open', () => {
      console.log(`[Host] Peer open. Room ID: ${roomId}`);
      onReady(roomId);
    });

    this.peer.on('error', (err) => {
      console.error('[Host] PeerJS Error:', err);
    });

    this.peer.on('connection', (conn) => {
      console.log(`[Host] Incoming connection from ${conn.peer}`);

      conn.on('open', () => {
        console.log(`[Host] Connection opened with ${conn.peer}`);
        this.connections.set(conn.peer, conn);
      });

      conn.on('data', (data) => {
        const msg = data as NetworkMessage;
        // Intercept join messages at the network layer to track names
        if (msg.type === 'PLAYER_JOINED') {
          console.log(`[Host] Player Joined: ${msg.name} (${msg.playerId})`);
          if (onClientJoined) {
            onClientJoined(msg.playerId, msg.name);
          }
        }

        if (this.onMessageCallback) {
          this.onMessageCallback(msg);
        }
      });

      conn.on('error', (err) => {
        console.error(`[Host] Connection error with ${conn.peer}:`, err);
      });

      conn.on('close', () => {
        console.log(`[Host] Connection closed with ${conn.peer}`);
        this.connections.delete(conn.peer);
        if (onClientLeft) {
          onClientLeft(conn.peer);
        }
      });
    });
  }

  joinRoom(roomId: string, playerName: string, onConnected: () => void, onError: (err: any) => void) {
    this.isHost = false;
    this.peer = new Peer({ debug: 2 }); // Client gets a random ID

    let connectionTimeout: any;

    this.peer.on('open', (id) => {
      console.log(`[Client] Peer open. My ID: ${id}. Connecting to flippit-${roomId}...`);
      // Store our own client ID so the UI knows who we are
      localStorage.setItem('clientId', id);

      const conn = this.peer!.connect(`flippit-${roomId}`, {
        reliable: true
      });

      // Set a 10 second timeout for the connection
      connectionTimeout = setTimeout(() => {
        console.error('[Client] Connection timeout');
        onError(new Error('Connection timed out. Ensure the host is still active and on the same network.'));
      }, 10000);

      conn.on('open', () => {
        console.log('[Client] Connection opened with Host');
        clearTimeout(connectionTimeout);
        this.connections.set('host', conn);
        // Announce ourselves immediately
        conn.send({ type: 'PLAYER_JOINED', playerId: id, name: playerName } as NetworkMessage);
        onConnected();
      });

      conn.on('data', (data) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(data as NetworkMessage);
        }
      });

      conn.on('error', (err) => {
        console.error('[Client] Connection Error:', err);
        clearTimeout(connectionTimeout);
        onError(err);
      });

      conn.on('close', () => {
        console.log('[Client] Connection closed by Host');
      });
    });

    this.peer.on('error', (err) => {
      console.error('[Client] PeerJS Error:', err);
      clearTimeout(connectionTimeout);
      onError(err);
    });
  }

  onMessage(callback: MessageHandler) {
    this.onMessageCallback = callback;
  }

  // Host broadcasts state to all clients
  broadcastState(state: GameState) {
    if (!this.isHost) return;
    const msg: NetworkMessage = { type: 'STATE_UPDATE', state };
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }

  // Client sends an action to the host
  sendAction(action: 'HIT' | 'STAY', playerId: string) {
    if (this.isHost) return;
    const conn = this.connections.get('host');
    if (conn && conn.open) {
      conn.send({ type: 'ACTION', action, playerId });
    }
  }

  disconnect() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const networkManager = new NetworkManager();

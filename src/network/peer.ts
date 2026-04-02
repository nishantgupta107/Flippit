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
    onClientJoined?: (clientId: string) => void
  ) {
    this.isHost = true;
    // Generate a random 4-6 character room code
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    this.peer = new Peer(`flippit-${roomId}`);

    this.peer.on('open', () => {
      onReady(roomId);
    });

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        if (onClientJoined) {
          onClientJoined(conn.peer);
        }
      });

      conn.on('data', (data) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(data as NetworkMessage);
        }
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
      });
    });
  }

  joinRoom(roomId: string, onConnected: () => void, onError: (err: any) => void) {
    this.isHost = false;
    this.peer = new Peer(); // Client gets a random ID

    this.peer.on('open', (id) => {
      // Store our own client ID so the UI knows who we are
      localStorage.setItem('clientId', id);
      const conn = this.peer!.connect(`flippit-${roomId}`);

      conn.on('open', () => {
        this.connections.set('host', conn);
        onConnected();
      });

      conn.on('data', (data) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(data as NetworkMessage);
        }
      });

      conn.on('error', onError);

      this.peer!.on('error', onError);
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

import PartySocket from "partysocket";
import { type MessageType, type GameMessage } from "./protocol";

/**
 * Room Manager Singleton
 * Inspired by Mojo architecture: Manages the lifecycle of a PartyKit connection.
 */
export class RoomManager {
  private static instance: RoomManager | null = null;
  private socket: PartySocket | null = null;
  private handlers: Map<MessageType, Array<(msg: GameMessage) => void>> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Connect to a specific room
   */
  public connect(roomId: string, userId: string, name: string) {
    if (this.socket) {
      this.socket.close();
    }

    // Priority: 1. Env Var, 2. Localhost, 3. Current Host (fallback)
    let host = import.meta.env.VITE_PARTYKIT_HOST;
    
    if (!host) {
      host = window.location.hostname === "localhost" ? "localhost:1999" : window.location.host;
    }

    this.socket = new PartySocket({
      host,
      room: roomId,
      id: userId,
      query: { name },
    });

    this.socket.onmessage = (evt) => {
      try {
        const message = JSON.parse(evt.data) as GameMessage;
        this.dispatch(message);
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    };

    console.log(`[RoomManager] Connecting to room ${roomId} as ${userId}`);
  }

  /**
   * Disconnect the current socket
   */
  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    console.log("[RoomManager] Disconnected");
  }

  /**
   * Send a message to the room
   */
  public send(type: MessageType, payload: any, roomId: string, senderId: string, senderName?: string) {
    if (!this.socket) return;

    const message: GameMessage = {
      type,
      payload,
      roomId,
      senderId,
      senderName,
      timestamp: Date.now(),
    };

    this.socket.send(JSON.stringify(message));
  }

  /**
   * Register a listener for a specific message type
   */
  public on(type: MessageType, handler: (msg: GameMessage) => void) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)?.push(handler);

    return () => {
      const list = this.handlers.get(type);
      if (list) {
        this.handlers.set(type, list.filter(h => h !== handler));
      }
    };
  }

  private dispatch(message: GameMessage) {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(h => h(message));
    }
  }

  public isConnected() {
    return this.socket?.readyState === 1; // OPEN
  }
}

import { create } from "zustand";
import { type GameState } from "../engine/types";
import { RoomManager } from "./RoomManager";
import { type GameStateSyncPayload, MessageTypes } from "./protocol";

/**
 * Connection Store
 * Manages the state of the online connection and room participants.
 */
interface MultiplayerStore {
  isConnected: boolean;
  roomId: string | null;
  userId: string | null;
  userName: string | null;
  isHost: boolean;
  players: Array<{ id: string; name: string }>;

  setConnection: (connected: boolean) => void;
  setRoom: (roomId: string, userId: string, name: string) => void;
  setIsHost: (isHost: boolean) => void;
  setPlayers: (players: Array<{ id: string; name: string }>) => void;
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  isConnected: false,
  roomId: null,
  userId: null,
  userName: null,
  isHost: false,
  players: [],

  setConnection: (connected) => set({ isConnected: connected }),
  setRoom: (roomId, userId, name) => set({ roomId, userId, userName: name }),
  setIsHost: (isHost) => set({ isHost }),
  setPlayers: (players) => set({ players }),
  reset: () => set({ 
    isConnected: false, roomId: null, userId: null, isHost: false, players: [] 
  }),
}));

/**
 * Game Network Adapter
 * Bridges the RoomManager with the local Game Engine/Store for multiplayer play.
 */
export class FlippitNetworkAdapter {
  private room: RoomManager;

  constructor() {
    this.room = RoomManager.getInstance();
  }

  /**
   * Broadcast your current state to all other players
   */
  public broadcastState(gameState: GameState) {
    const { roomId, userId, userName } = useMultiplayerStore.getState();
    if (roomId && userId) {
      this.room.send(
        MessageTypes.GAME_STATE_SYNC,
        { gameState } as GameStateSyncPayload,
        roomId,
        userId,
        userName || undefined
      );
    }
  }

  /**
   * Request a full state sync from the host
   */
  public requestStateSync() {
    const { roomId, userId } = useMultiplayerStore.getState();
    if (roomId && userId) {
      this.room.send(
        MessageTypes.REQUEST_STATE_SYNC,
        {},
        roomId,
        userId
      );
    }
  }

  /**
   * Initialize a new room connection
   */
  public joinRoom(roomId: string, userId: string, name: string) {
    this.room.connect(roomId, userId, name);
    useMultiplayerStore.getState().setRoom(roomId, userId, name);
    useMultiplayerStore.getState().setConnection(true);
  }

  /**
   * Handle joining/leaving and state updates
   */
  public disconnect() {
    this.room.disconnect();
    useMultiplayerStore.getState().reset();
  }
}

export const networkAdapter = new FlippitNetworkAdapter();

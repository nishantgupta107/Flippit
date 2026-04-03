import type { GameState } from '../engine/types';

export type MessageType = 
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'SYNC_PLAYERS'
  | 'START_GAME'
  | 'GAME_STATE_SYNC'
  | 'REQUEST_STATE_SYNC'
  | 'GAME_ACTION';

export const MessageTypes = {
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
  SYNC_PLAYERS: 'SYNC_PLAYERS',
  START_GAME: 'START_GAME',
  GAME_STATE_SYNC: 'GAME_STATE_SYNC',
  REQUEST_STATE_SYNC: 'REQUEST_STATE_SYNC',
  GAME_ACTION: 'GAME_ACTION',
} as const;

export interface GameMessage<T = any> {
  type: MessageType;
  roomId: string;
  senderId: string;
  senderName?: string;
  payload: T;
  timestamp: number;
}

/**
 * Flippit specific payloads
 */
export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
}

export interface SyncPlayersPayload {
  players: PlayerInfo[];
}

export interface GameStateSyncPayload {
  gameState: GameState;
}

export interface GameActionPayload {
  action: 'HIT' | 'STAY' | 'NEXT_ROUND' | 'START';
  details?: Record<string, any>;
}

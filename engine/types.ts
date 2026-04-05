export type CardType =
  | 'NUMBER'
  | 'MODIFIER_MULT'
  | 'MODIFIER_BONUS'
  | 'ACTION_SECOND_CHANCE'
  | 'ACTION_FREEZE'
  | 'ACTION_FLIP_THREE';

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type GamePhase =
  | 'IDLE'
  | 'DEALING'
  | 'PLAYER_TURN'
  | 'DECISION'
  | 'ROUND_OVER'
  | 'GAME_OVER';

export interface Card {
  id: string;
  type: CardType;
  value: number;
}

export interface PlayerInput {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
}

export interface PlayerState extends PlayerInput {
  hand: Card[];
  roundScore: number;
  totalScore: number;
  active: boolean;
  hasBanked: boolean;
  hasShield: boolean;
  outReason?: 'BUSTED' | 'FROZEN' | 'BANKED';
}

export interface PendingAction {
  type: 'FREEZE_TARGET' | 'FLIP_THREE_TARGET' | 'SECOND_CHANCE_TARGET';
  actingPlayerId: string;
}

export interface GameState {
  phase: GamePhase;
  players: PlayerState[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  roundNumber: number;
  roundOver: boolean;
  gameOver: boolean;
  winner: string | null;
  seed: number;
  roundSeed: number;
  pendingAction?: PendingAction;
  pendingActionPassCount?: number;
}

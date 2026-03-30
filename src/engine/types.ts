// ─── Card Types ──────────────────────────────────────────────────────────────

export type CardType = 'number' | 'modifier' | 'action';
export type ActionKind = 'freeze' | 'flip_three' | 'second_chance';
export type ModifierKind = '+2' | '+4' | '+6' | '+8' | '+10' | 'x2';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Card {
  id: string;          // unique runtime UUID
  type: CardType;
  value?: number;      // 0–12 for number cards
  modifier?: ModifierKind;
  action?: ActionKind;
}

// ─── Player State ─────────────────────────────────────────────────────────────

export type PlayerStatus = 'active' | 'stayed' | 'busted' | 'frozen';

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  difficulty?: Difficulty;
  numberCards: Card[];    // unique numbers in the row
  modifierCards: Card[];  // +2/+4/+6/+8/+10/x2 cards above the row
  actionCards: Card[];    // Second Chance if held (max 1)
  status: PlayerStatus;
  roundScore: number;     // score for current round (0 if busted)
  totalScore: number;     // cumulative across all rounds
}

// ─── Pending Action ───────────────────────────────────────────────────────────

export interface PendingFlipThree {
  type: 'flip_three';
  targetPlayerId: string;
  cardsRemaining: number;
  deferredActions: Card[];  // action cards drawn mid-flip-three, resolved after
}

// ─── Game Phase ───────────────────────────────────────────────────────────────

export type GamePhase = 'deal' | 'play' | 'round_end' | 'game_over';

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  phase: GamePhase;
  drawPile: Card[];
  discardPile: Card[];
  players: PlayerState[];
  dealerIndex: number;
  activePlayerIndex: number;
  roundNumber: number;
  pendingAction: PendingFlipThree | null;
  winner: string | null;   // player id of the winner
  lastEvent: GameEvent | null;
}

// ─── Game Events (for UI feedback) ───────────────────────────────────────────

export type GameEventKind =
  | 'card_drawn'
  | 'bust'
  | 'stay'
  | 'freeze'
  | 'flip_three_start'
  | 'flip_three_card'
  | 'second_chance_used'
  | 'second_chance_passed'
  | 'flip_seven'
  | 'round_end'
  | 'game_over';

export interface GameEvent {
  kind: GameEventKind;
  playerId: string;
  card?: Card;
  message?: string;
}

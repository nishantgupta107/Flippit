import type { GameState, PlayerState } from '../engine/types';

export type LogCategory = 'user' | 'game' | 'ai';

export interface LogEntry {
  id: string;
  timestamp: number;
  category: LogCategory;
  action: string;
  playerId?: string;
  details: Record<string, unknown>;
  gameStateSnapshot?: {
    phase: GameState['phase'];
    activePlayerIndex: number;
    deckRemaining: number;
    players: Array<{
      id: string;
      name: string;
      isAI: boolean;
      status: PlayerState['status'];
      handSize: number;
      totalScore: number;
      roundScore: number;
    }>;
  };
}

const MAX_LOGS = 1000;
const API_ENDPOINT = '/api/dump-logs';

let logs: LogEntry[] = [];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getHandSize(player: PlayerState): number {
  return player.numberCards.length + player.modifierCards.length + player.actionCards.length;
}

function createSnapshot(gameState?: GameState | null): LogEntry['gameStateSnapshot'] | undefined {
  if (!gameState) return undefined;
  
  return {
    phase: gameState.phase,
    activePlayerIndex: gameState.activePlayerIndex,
    deckRemaining: gameState.drawPile.length,
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      isAI: p.isAI,
      status: p.status,
      handSize: getHandSize(p),
      totalScore: p.totalScore,
      roundScore: p.roundScore,
    })),
  };
}

function addLog(entry: LogEntry): void {
  logs.push(entry);
  
  // Circular buffer: remove oldest if exceeding max
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  // Also log to console for immediate visibility
  const timestamp = new Date(entry.timestamp).toISOString();
  console.log(`[${timestamp}] [${entry.category.toUpperCase()}] ${entry.action}`, entry.details);
}

export function logUserAction(
  action: string,
  details: Record<string, unknown> = {},
  gameState?: GameState | null
): void {
  addLog({
    id: generateId(),
    timestamp: Date.now(),
    category: 'user',
    action,
    details,
    gameStateSnapshot: createSnapshot(gameState),
  });
}

export function logGameEvent(
  action: string,
  details: Record<string, unknown> = {},
  gameState?: GameState | null,
  playerId?: string
): void {
  addLog({
    id: generateId(),
    timestamp: Date.now(),
    category: 'game',
    action,
    playerId,
    details,
    gameStateSnapshot: createSnapshot(gameState),
  });
}

export function logAIEvent(
  action: string,
  details: Record<string, unknown> = {},
  gameState?: GameState | null,
  playerId?: string
): void {
  addLog({
    id: generateId(),
    timestamp: Date.now(),
    category: 'ai',
    action,
    playerId,
    details,
    gameStateSnapshot: createSnapshot(gameState),
  });
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function clearLogs(): void {
  logs = [];
}

function formatLogEntry(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(entry.timestamp % 1000).padStart(3, '0');
  
  let line = `[${time}.${ms}] [${entry.category.toUpperCase()}] ${entry.action}`;
  
  if (entry.playerId) {
    line += ` | Player: ${entry.playerId}`;
  }
  
  if (Object.keys(entry.details).length > 0) {
    line += ` | ${JSON.stringify(entry.details)}`;
  }
  
  if (entry.gameStateSnapshot) {
    const snap = entry.gameStateSnapshot;
    line += `\n    State: phase=${snap.phase}, active=${snap.activePlayerIndex}, deck=${snap.deckRemaining}`;
    line += `\n    Players: ${snap.players.map(p => `${p.name}(${p.handSize}cards,${p.roundScore}pts,${p.status})`).join(', ')}`;
  }
  
  return line;
}

export function generateTextDump(): string {
  return logs.map(formatLogEntry).join('\n\n');
}

export async function dumpLogsToServer(): Promise<{ success: boolean; message: string }> {
  if (logs.length === 0) {
    return { success: false, message: 'No logs to dump' };
  }
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs: logs,
        timestamp: Date.now(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    clearLogs();
    return { success: true, message: `Dumped ${result.count} logs to server` };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to dump logs: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

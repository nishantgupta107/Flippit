import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { Card, PlayerState } from '../../engine/types';
import { calculateRoundScore } from '../../engine/scoring';

// ─── Card Display ─────────────────────────────────────────────────────────────

function CardBadge({ card }: { card: Card }) {
  const label =
    card.type === 'number'
      ? String(card.value)
      : card.type === 'modifier'
      ? card.modifier!
      : card.action === 'freeze'
      ? '❄️FREEZE'
      : card.action === 'flip_three'
      ? '🔄FLIP3'
      : '⭐SC';

  const bg =
    card.type === 'number'
      ? '#2a6'
      : card.type === 'modifier'
      ? '#68d3ff'
      : '#fe7e4f';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        margin: '2px',
        borderRadius: 6,
        background: bg,
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {label}
    </span>
  );
}

// ─── Player Panel ─────────────────────────────────────────────────────────────

function PlayerPanel({
  player,
  isActive,
}: {
  player: PlayerState;
  isActive: boolean;
}) {
  const border = isActive ? '3px solid #ffe792' : '1px solid #444';
  const statusEmoji =
    player.status === 'active'
      ? '🟢'
      : player.status === 'stayed'
      ? '🏦'
      : player.status === 'busted'
      ? '💥'
      : '❄️';

  return (
    <div
      id={`player-panel-${player.id}`}
      style={{
        border,
        borderRadius: 10,
        padding: '1rem',
        margin: '0.5rem 0',
        background: '#011f10',
      }}
    >
      <strong>
        {statusEmoji} {player.name} {player.isAI ? '(CPU)' : '(You)'}
      </strong>
      <span style={{ marginLeft: 12, color: '#ffe792' }}>
        Total: {player.totalScore} | Round: {calculateRoundScore(player)}
      </span>

      <div style={{ marginTop: 8 }}>
        {player.numberCards.length > 0 && (
          <div>
            <span style={{ fontSize: 12, color: '#7ab890' }}>Numbers: </span>
            {player.numberCards.map((c) => (
              <CardBadge key={c.id} card={c} />
            ))}
          </div>
        )}
        {player.modifierCards.length > 0 && (
          <div>
            <span style={{ fontSize: 12, color: '#7ab890' }}>Modifiers: </span>
            {player.modifierCards.map((c) => (
              <CardBadge key={c.id} card={c} />
            ))}
          </div>
        )}
        {player.actionCards.length > 0 && (
          <div>
            <span style={{ fontSize: 12, color: '#7ab890' }}>Action cards: </span>
            {player.actionCards.map((c) => (
              <CardBadge key={c.id} card={c} />
            ))}
          </div>
        )}
        {player.numberCards.length === 0 &&
          player.modifierCards.length === 0 &&
          player.actionCards.length === 0 && (
            <span style={{ color: '#7ab890', fontSize: 12 }}>(no cards)</span>
          )}
      </div>
    </div>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export function Game() {
  const navigate = useNavigate();
  const { gameState, isAIThinking, hit, stay, startNextRound, resetGame } =
    useGameStore();

  if (!gameState) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No game in progress.</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  const { phase, players, activePlayerIndex, roundNumber, drawPile, discardPile, lastEvent, winner } =
    gameState;

  const humanPlayer = players.find((p) => !p.isAI);
  const humanIdx = players.findIndex((p) => !p.isAI);
  const isHumanTurn = activePlayerIndex === humanIdx && phase === 'play';
  const canAct =
    isHumanTurn &&
    !isAIThinking &&
    humanPlayer?.status === 'active';

  return (
    <div
      id="game-screen"
      style={{
        padding: '1rem',
        maxWidth: 600,
        margin: '0 auto',
        fontFamily: 'sans-serif',
        color: '#c8f5dc',
        background: '#001209',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #044228',
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        <h2 id="round-indicator" style={{ margin: 0, color: '#ffe792' }}>
          Round {roundNumber}
        </h2>
        <div style={{ fontSize: 13, color: '#7ab890' }}>
          🃏 Draw: {drawPile.length} | 🗑️ Discard: {discardPile.length}
        </div>
        <button
          id="btn-quit"
          onClick={() => {
            resetGame();
            navigate('/');
          }}
          style={{ padding: '4px 12px' }}
        >
          Quit
        </button>
      </div>

      {/* Last Event Banner */}
      {lastEvent && lastEvent.kind !== 'round_end' && lastEvent.kind !== 'game_over' && (
        <div
          id="event-banner"
          style={{
            background: '#033520',
            border: '1px solid #0a5c38',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {lastEvent.kind === 'bust' && (
            <span>💥 {players.find((p) => p.id === lastEvent.playerId)?.name} busted!</span>
          )}
          {lastEvent.kind === 'stay' && (
            <span>🏦 {players.find((p) => p.id === lastEvent.playerId)?.name} stayed.</span>
          )}
          {lastEvent.kind === 'freeze' && (
            <span>❄️ {lastEvent.message}</span>
          )}
          {lastEvent.kind === 'flip_three_start' && (
            <span>🔄 {lastEvent.message}</span>
          )}
          {lastEvent.kind === 'flip_seven' && (
            <span style={{ color: '#ffe792', fontWeight: 700 }}>
              🎉 FLIP 7! {players.find((p) => p.id === lastEvent.playerId)?.name} got 7 unique cards!
            </span>
          )}
          {lastEvent.kind === 'second_chance_used' && (
            <span>⭐ Second Chance saved {players.find((p) => p.id === lastEvent.playerId)?.name}!</span>
          )}
          {lastEvent.kind === 'second_chance_passed' && (
            <span>⭐ {lastEvent.message}</span>
          )}
          {lastEvent.kind === 'card_drawn' && lastEvent.card && (
            <span>
              Drew:{' '}
              {lastEvent.card.type === 'number'
                ? lastEvent.card.value
                : lastEvent.card.modifier ?? lastEvent.card.action}
            </span>
          )}
        </div>
      )}

      {/* AI Thinking */}
      {isAIThinking && (
        <div
          id="ai-thinking"
          style={{ textAlign: 'center', padding: 8, color: '#7ab890', fontSize: 13 }}
        >
          🤔 CPU is thinking...
        </div>
      )}

      {/* Active Player Indicator */}
      {phase === 'play' && (
        <div
          id="active-player-indicator"
          style={{ fontSize: 13, color: '#7ab890', marginBottom: 8 }}
        >
          Active: {players[activePlayerIndex]?.name ?? '—'}
        </div>
      )}

      {/* Player Panels */}
      {players.map((p, idx) => (
        <PlayerPanel key={p.id} player={p} isActive={idx === activePlayerIndex && phase === 'play'} />
      ))}

      {/* Action Buttons */}
      {phase === 'play' && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: 16 }}>
          <button
            id="btn-hit"
            onClick={hit}
            disabled={!canAct}
            style={{
              flex: 1,
              padding: '12px',
              background: canAct ? '#ffe792' : '#444',
              color: canAct ? '#1a1200' : '#888',
              border: 'none',
              borderRadius: 24,
              fontWeight: 700,
              fontSize: 16,
              cursor: canAct ? 'pointer' : 'not-allowed',
            }}
          >
            HIT
          </button>
          <button
            id="btn-stay"
            onClick={stay}
            disabled={!canAct}
            style={{
              flex: 1,
              padding: '12px',
              background: canAct ? '#fe7e4f' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              cursor: canAct ? 'pointer' : 'not-allowed',
            }}
          >
            STAY
          </button>
        </div>
      )}

      {/* Round End Summary */}
      {phase === 'round_end' && (
        <div
          id="round-summary"
          style={{
            marginTop: 24,
            padding: '1rem',
            background: '#02291a',
            borderRadius: 12,
            border: '1px solid #044228',
          }}
        >
          <h3 style={{ color: '#ffe792', marginTop: 0 }}>Round {roundNumber - 1} Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#7ab890', fontSize: 13, textAlign: 'left' }}>
                <th>Player</th>
                <th>Round</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td style={{ color: p.roundScore > 0 ? '#ffe792' : '#fe7e4f' }}>
                    {p.status === 'busted' ? '💥 0' : `+${p.roundScore}`}
                  </td>
                  <td>{p.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            id="btn-next-round"
            onClick={startNextRound}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px',
              background: '#ffe792',
              color: '#1a1200',
              border: 'none',
              borderRadius: 24,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Next Round →
          </button>
        </div>
      )}

      {/* Game Over */}
      {phase === 'game_over' && (
        <div
          id="game-over"
          style={{
            marginTop: 24,
            padding: '1.5rem',
            background: '#02291a',
            borderRadius: 12,
            border: '2px solid #ffe792',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#ffe792', marginTop: 0 }}>🏆 Game Over!</h2>
          <p style={{ fontSize: 20 }}>
            {players.find((p) => p.id === winner)?.name ?? 'Unknown'} wins!
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ color: '#7ab890', textAlign: 'left' }}>
                <th>Player</th>
                <th>Final Score</th>
              </tr>
            </thead>
            <tbody>
              {[...players]
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((p) => (
                  <tr key={p.id} style={{ color: p.id === winner ? '#ffe792' : '#c8f5dc' }}>
                    <td>{p.id === winner ? '👑 ' : ''}{p.name}</td>
                    <td>{p.totalScore}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <button
            id="btn-play-again"
            onClick={() => {
              resetGame();
              navigate('/');
            }}
            style={{
              padding: '12px 32px',
              background: '#ffe792',
              color: '#1a1200',
              border: 'none',
              borderRadius: 24,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { calculateRoundScore } from '../../engine/scoring';
import type { PlayerState } from '../../engine/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ScoreHUD } from '../../components/ui/ScoreHUD';
import { Chip } from '../../components/ui/Chip';

// ─── Player Hand View ─────────────────────────────────────────────────────────

function PlayerHand({ player, isActive }: { player: PlayerState; isActive: boolean }) {
  const roundScore = calculateRoundScore(player);
  
  const statusEmoji =
    player.status === 'active' ? '🟢' :
    player.status === 'stayed' ? '🏦' :
    player.status === 'busted' ? '💥' : '❄️';

  return (
    <div style={{
      background: isActive ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '1.25rem' }}>{statusEmoji}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{player.name}</span>
          {player.isAI && <Chip label="CPU" variant="outline" />}
        </div>
        <ScoreHUD score={roundScore} label="Round" />
      </div>

      {/* Cards Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: '120px' }}>
        {/* Modifiers & Actions */}
        {(player.modifierCards.length > 0 || player.actionCards.length > 0) && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {player.modifierCards.map((c) => (
               <Chip key={c.id} label={c.modifier!} variant="multiplier" />
            ))}
            {player.actionCards.map((c) => (
               <Chip key={c.id} label={c.action!} variant="action" />
            ))}
          </div>
        )}

        {/* Number Cards Row (Overlapping) */}
        <div style={{ display: 'flex', flexWrap: 'nowrap', position: 'relative', height: '112px' }}>
          {player.numberCards.length === 0 ? (
            <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: 'var(--space-4)' }}>No cards drawn.</div>
          ) : (
            player.numberCards.map((c, i) => (
              <div key={c.id} style={{ 
                position: i === 0 ? 'relative' : 'absolute',
                left: i === 0 ? 0 : `${i * 35}px`,
                zIndex: i,
              }}>
                <Card card={c} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export function Game() {
  const navigate = useNavigate();
  const { gameState, isAIThinking, hit, stay, startNextRound, resetGame } = useGameStore();

  if (!gameState) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No game in progress.</p>
        <Button onClick={() => navigate('/')}>Back</Button>
      </div>
    );
  }

  const { phase, players, activePlayerIndex, roundNumber, drawPile, discardPile, lastEvent, winner } = gameState;
  
  const humanIdx = players.findIndex((p) => !p.isAI);
  const humanPlayer = players[humanIdx];
  const isHumanTurn = activePlayerIndex === humanIdx && phase === 'play';
  const canAct = isHumanTurn && !isAIThinking && humanPlayer?.status === 'active';

  // Separate AI from Human
  const aiPlayers = players.filter(p => p.isAI);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      color: 'var(--on-surface)',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle Background Glow */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100vw',
        height: '100vw',
        background: 'radial-gradient(circle, var(--surface-tint) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Top Bar */}
      <header style={{ 
        padding: 'var(--space-4)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        zIndex: 1,
        borderBottom: '1px solid var(--outline-variant)'
      }}>
        <ScoreHUD score={humanPlayer?.totalScore ?? 0} label="Total Score" />
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary)' }}>Round {roundNumber}</span>
          <button onClick={() => { resetGame(); navigate('/'); }} style={{
            background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontSize: '1rem'
          }}>
            Quit
          </button>
        </div>
      </header>

      {/* Main Play Area */}
      <main style={{ 
        flex: 1, 
        padding: 'var(--space-4)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--space-6)',
        zIndex: 1,
        overflowY: 'auto',
      }}>
        
        {/* Opponents Area */}
        {aiPlayers.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: aiPlayers.length > 1 ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
            {aiPlayers.map(ai => (
              <PlayerHand 
                key={ai.id} 
                player={ai} 
                isActive={players[activePlayerIndex]?.id === ai.id && phase === 'play'} 
              />
            ))}
          </div>
        )}

        {/* Center Table (Draw/Discard & Events) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-8)', margin: 'var(--space-4) 0' }}>
          <div style={{ position: 'relative' }}>
             <Card isFaceDown />
             <div style={{ position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{drawPile.length} cards</div>
          </div>
          <div style={{ position: 'relative' }}>
             {discardPile.length > 0 ? (
               <Card card={discardPile[discardPile.length - 1]} />
             ) : (
               <div style={{ width: '80px', height: '112px', border: '1px dashed var(--outline-variant)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>Discard</div>
             )}
          </div>
        </div>

        {/* Event Toast */}
        <AnimatePresence>
          {lastEvent && lastEvent.kind !== 'round_end' && lastEvent.kind !== 'game_over' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'var(--surface-variant)',
                backdropFilter: 'blur(10px)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-full)',
                alignSelf: 'center',
                textAlign: 'center',
                border: '1px solid var(--outline-variant)',
                fontSize: '0.875rem'
              }}
            >
              <strong style={{ color: 'var(--primary)' }}>{players.find((p) => p.id === lastEvent.playerId)?.name}:</strong> {lastEvent.message || lastEvent.kind.replace('_', ' ')}
            </motion.div>
          )}
        </AnimatePresence>

        {isAIThinking && (
           <div style={{ textAlign: 'center', color: 'var(--tertiary)', fontSize: '0.875rem', animation: 'pulse 1.5s infinite' }}>Thinking...</div>
        )}

        {/* Human Area */}
        {humanPlayer && (
          <div style={{ marginTop: 'auto' }}>
            <PlayerHand 
              player={humanPlayer} 
              isActive={players[activePlayerIndex]?.id === humanPlayer.id && phase === 'play'} 
            />
          </div>
        )}
      </main>

      {/* Footer / Controls */}
      <footer style={{
        padding: 'var(--space-4)',
        background: 'var(--surface-container-highest)',
        borderTop: '1px solid var(--outline-variant)',
        display: 'flex',
        gap: 'var(--space-4)',
        zIndex: 2,
      }}>
        {phase === 'play' && (
          <>
            <Button 
              style={{ flex: 1 }} 
              disabled={!canAct} 
              onClick={hit}
            >
              HIT
            </Button>
            <Button 
              variant="secondary" 
              style={{ flex: 1 }} 
              disabled={!canAct} 
              onClick={stay}
            >
              STAY
            </Button>
          </>
        )}
      </footer>

      {/* Overlay Modals (Round End & Game Over) */}
      <AnimatePresence>
        {(phase === 'round_end' || phase === 'game_over') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,18,9,0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 'var(--space-6)'
            }}
          >
            <div style={{
              background: 'var(--surface-container-high)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              width: '100%',
              maxWidth: 400,
              display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
              boxShadow: 'var(--shadow-float)'
            }}>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', textAlign: 'center', fontSize: '2rem' }}>
                {phase === 'game_over' ? '🏆 Game Over' : `Round ${roundNumber - 1} Summary`}
              </h2>
              
              {phase === 'game_over' && (
                <div style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>
                  {players.find((p) => p.id === winner)?.name} wins!
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[...players].sort((a, b) => b.totalScore - a.totalScore).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)' }}>
                    <span>{p.name} {p.id === winner && phase === 'game_over' ? '👑' : ''}</span>
                    <strong style={{ color: p.roundScore > 0 ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                      {phase === 'round_end' && `(+${p.roundScore}) `}
                      {p.totalScore}
                    </strong>
                  </div>
                ))}
              </div>

              {phase === 'round_end' ? (
                <Button onClick={startNextRound}>Next Round</Button>
              ) : (
                <Button onClick={() => { resetGame(); navigate('/'); }}>Play Again</Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

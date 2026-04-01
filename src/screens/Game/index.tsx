import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { calculateRoundScore } from '../../engine/scoring';
import type { PlayerState } from '../../engine/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ScoreHUD } from '../../components/ui/ScoreHUD';
import { Chip } from '../../components/ui/Chip';
import { DebugDumpButton } from '../../components/DebugDumpButton';
import type { PendingDrawAnimation } from '../../store/drawAnimation';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 112;
const MAX_CARD_SPACING = 8;

interface FloatingCardPosition {
  x: number;
  y: number;
}

interface FloatingCardMetrics {
  source: FloatingCardPosition;
  destination: FloatingCardPosition;
}

function getCardSpacing(containerWidth: number, totalCards: number): number {
  if (totalCards <= 1) {
    return 0;
  }

  return Math.min(MAX_CARD_SPACING, (containerWidth - totalCards * CARD_WIDTH) / (totalCards - 1));
}

// ─── Player Hand View ─────────────────────────────────────────────────────────

function PlayerHand({
  player,
  isActive,
  pendingDrawAnimation,
  numberRowRef,
  cardsAreaRef,
  incomingSlotRef,
}: {
  player: PlayerState;
  isActive: boolean;
  pendingDrawAnimation?: PendingDrawAnimation | null;
  numberRowRef?: (node: HTMLDivElement | null) => void;
  cardsAreaRef?: (node: HTMLDivElement | null) => void;
  incomingSlotRef?: (node: HTMLDivElement | null) => void;
}) {
  const roundScore = calculateRoundScore(player);
  const shouldOmitPendingCard = pendingDrawAnimation?.playerId === player.id;
  const displayedNumberCards = shouldOmitPendingCard
    ? player.numberCards.filter((card) => card.id !== pendingDrawAnimation.card.id)
    : player.numberCards;
  const pendingNumberCardIndex =
    pendingDrawAnimation?.playerId === player.id && pendingDrawAnimation.card.type === 'number'
      ? player.numberCards.findIndex((card) => card.id === pendingDrawAnimation.card.id)
      : -1;
  const renderNumberCards =
    pendingDrawAnimation?.phase === 'travel' && pendingNumberCardIndex !== -1
      ? [
          ...displayedNumberCards.slice(0, pendingNumberCardIndex),
          null,
          ...displayedNumberCards.slice(pendingNumberCardIndex),
        ]
      : displayedNumberCards;
  const displayedModifierCards = shouldOmitPendingCard
    ? player.modifierCards.filter((card) => card.id !== pendingDrawAnimation.card.id)
    : player.modifierCards;
  const displayedActionCards = shouldOmitPendingCard
    ? player.actionCards.filter((card) => card.id !== pendingDrawAnimation.card.id)
    : player.actionCards;
  
  const statusEmoji =
    player.status === 'active' ? '🟢' :
    player.status === 'stayed' ? '🏦' :
    player.status === 'busted' ? '💥' : '❄️';

  const isFlip7 = new Set(player.numberCards.map(c => c.value)).size >= 7;

  return (
    <motion.div 
      animate={
        player.status === 'busted' ? { x: [-10, 10, -10, 10, 0], opacity: 0.6 } :
        isFlip7 ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0px var(--primary)', '0 0 30px var(--primary)', '0 0 10px var(--primary)'] } :
        { opacity: 1, x: 0, scale: 1 }
      }
      transition={{ duration: 0.5 }}
      style={{
        background: isActive ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
        transition: 'background 0.3s ease, border 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Freeze Overlay */}
      <AnimatePresence>
        {player.status === 'frozen' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(104, 211, 255, 0.1)',
              backdropFilter: 'blur(2px)',
              zIndex: 10,
              pointerEvents: 'none'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '1.25rem' }}>{statusEmoji}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{player.name}</span>
          {player.isAI && <Chip label="CPU" variant="outline" />}
        </div>
        <ScoreHUD score={roundScore} label="Round" />
      </div>

      {/* Cards Area */}
      <div
        ref={cardsAreaRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: '120px', zIndex: 11 }}
      >
        {/* Modifiers & Actions */}
        {(displayedModifierCards.length > 0 || displayedActionCards.length > 0) && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {displayedModifierCards.map((c) => (
               <Chip key={c.id} label={c.modifier!} variant="multiplier" />
            ))}
            {displayedActionCards.map((c) => (
               <Chip key={c.id} label={c.action!} variant="action" />
            ))}
          </div>
        )}

        {/* Number Cards Row (Overlapping) */}
        <div ref={numberRowRef} style={{ display: 'flex', width: '100%', height: '112px' }}>
          {renderNumberCards.length === 0 ? (
            <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: 'var(--space-4)' }}>No cards drawn.</div>
          ) : (
            renderNumberCards.map((c, i, arr) => {
              const N = arr.length;
              const overlapSpace = N > 1 ? `calc((100% - ${N * 80}px) / ${N - 1})` : '0px';

              if (!c) {
                return (
                  <div
                    key={`incoming-slot-${player.id}-${pendingDrawAnimation?.card.id ?? i}`}
                    ref={incomingSlotRef}
                    style={{
                      marginLeft: i === 0 ? '0px' : `min(0.5rem, ${overlapSpace})`,
                      width: `${CARD_WIDTH}px`,
                      height: `${CARD_HEIGHT}px`,
                      flexShrink: 0,
                      opacity: 0,
                      pointerEvents: 'none',
                    }}
                  />
                );
              }
              
              return (
              <motion.div 
                key={c.id}
                layout
                initial={false}
                animate={{ 
                  opacity: 1,
                  rotateZ: player.status === 'frozen' ? 90 : 0
                }}
                transition={{ 
                  type: 'spring', stiffness: 260, damping: 16, mass: 0.85,
                  rotateZ: { type: 'spring', delay: player.status === 'frozen' ? i * 0.3 : 0 }
                }}
                style={{ 
                  marginLeft: i === 0 ? '0px' : `min(0.5rem, ${overlapSpace})`,
                  zIndex: i,
                  transformOrigin: 'bottom left',
                  borderRadius: 'var(--radius-md)',
                  flexShrink: 0
                }}
              >
                <Card
                  card={c}
                  status={player.status === 'active' ? undefined : player.status}
                  disableIntroAnimation
                />
              </motion.div>
            )})
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Flip 7 Celebration ────────────────────────────────────────────────────────

function Flip7Celebration() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000, overflow: 'hidden' }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            y: -20, 
            x: Math.random() * window.innerWidth,
            rotate: 0,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: window.innerHeight + 20,
            rotate: 360,
            x: `calc(${Math.random() * 100}vw - 50vw)` // drift
          }}
          transition={{ 
            duration: Math.random() * 2 + 2,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2
          }}
          style={{
            position: 'absolute',
            width: 15, height: 15,
            background: ['var(--primary)', 'var(--secondary)', 'var(--tertiary)'][Math.floor(Math.random() * 3)],
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export function Game() {
  const navigate = useNavigate();
  const { gameState, isAIThinking, hit, stay, startNextRound, resetGame, pendingDrawAnimation } = useGameStore();
  const deckFlipAnchorRef = useRef<HTMLDivElement | null>(null);
  const numberRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardsAreaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const incomingSlotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [floatingCardMetrics, setFloatingCardMetrics] = useState<FloatingCardMetrics | null>(null);

  useLayoutEffect(() => {
    if (!gameState || !pendingDrawAnimation) {
      setFloatingCardMetrics(null);
      return;
    }

    const deckRect = deckFlipAnchorRef.current?.getBoundingClientRect();
    if (!deckRect) {
      return;
    }

    const targetPlayer = gameState.players.find((player) => player.id === pendingDrawAnimation.playerId);
    if (!targetPlayer) {
      return;
    }

    const source = {
      x: deckRect.left,
      y: deckRect.top,
    };

    let destination = source;

    if (pendingDrawAnimation.card.type === 'number') {
      const incomingSlotRect = incomingSlotRefs.current[pendingDrawAnimation.playerId]?.getBoundingClientRect();
      if (incomingSlotRect) {
        destination = {
          x: incomingSlotRect.left,
          y: incomingSlotRect.top,
        };
      } else {
        const rowRect = numberRowRefs.current[pendingDrawAnimation.playerId]?.getBoundingClientRect();
        if (rowRect) {
          const cardIndex = targetPlayer.numberCards.findIndex((card) => card.id === pendingDrawAnimation.card.id);
          const spacing = getCardSpacing(rowRect.width, targetPlayer.numberCards.length);

          destination = {
            x: rowRect.left + Math.max(cardIndex, 0) * spacing,
            y: rowRect.top,
          };
        }
      }
    } else {
      const handAreaRect = cardsAreaRefs.current[pendingDrawAnimation.playerId]?.getBoundingClientRect();
      if (handAreaRect) {
        destination = {
          x: handAreaRect.left,
          y: handAreaRect.top,
        };
      }
    }

    setFloatingCardMetrics({ source, destination });
  }, [gameState, pendingDrawAnimation]);

  if (!gameState) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No game in progress.</p>
        <Button onClick={() => navigate('/')}>Back</Button>
      </div>
    );
  }

  const { phase, players, activePlayerIndex, roundNumber, drawPile, lastEvent, winner } = gameState;
  
  const humanIdx = players.findIndex((p) => !p.isAI);
  const humanPlayer = players[humanIdx];
  const isHumanTurn = activePlayerIndex === humanIdx && phase === 'play';
  const canAct = isHumanTurn && !isAIThinking && humanPlayer?.status === 'active';

  // Separate AI from Human
  const aiPlayers = players.filter(p => p.isAI);
  const hasFlip7 = players.some(p => new Set(p.numberCards.map(c => c.value)).size >= 7);

  function registerNumberRowRef(playerId: string) {
    return (node: HTMLDivElement | null) => {
      numberRowRefs.current[playerId] = node;
    };
  }

  function registerCardsAreaRef(playerId: string) {
    return (node: HTMLDivElement | null) => {
      cardsAreaRefs.current[playerId] = node;
    };
  }

  function registerIncomingSlotRef(playerId: string) {
    return (node: HTMLDivElement | null) => {
      incomingSlotRefs.current[playerId] = node;
    };
  }

  return (
    <div style={{
      height: '100%',
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

      {hasFlip7 && <Flip7Celebration />}

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
            background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontSize: '1rem', cursor: 'pointer'
          }}>
            Quit
          </button>
        </div>
      </header>

      {/* Main Play Area */}
      <main style={{ 
        flex: 1, 
        minHeight: 0,
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
                pendingDrawAnimation={pendingDrawAnimation}
                numberRowRef={registerNumberRowRef(ai.id)}
                cardsAreaRef={registerCardsAreaRef(ai.id)}
                incomingSlotRef={registerIncomingSlotRef(ai.id)}
              />
            ))}
          </div>
        )}

        {/* Center Table (Draw Deck & Events) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 'var(--space-4) 0', minHeight: '140px' }}>
          {/* Deck permanently offset to the left, with a flip slot beside it */}
          <div style={{ position: 'relative', width: '180px', height: '112px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '80px', height: '112px' }}>
              {drawPile.length > 0 && Array.from({ length: Math.min(5, Math.max(1, Math.ceil(drawPile.length / 10))) }).map((_, i) => (
                  <div key={i} style={{ position: 'absolute', top: -i * 2, left: -i * 2, zIndex: i }}>
                    <Card isFaceDown />
                  </div>
              ))}
              {drawPile.length === 0 && (
                  <div style={{ width: '100%', height: '100%', border: '2px dashed var(--outline)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>Empty</div>
              )}
              
              <div style={{ position: 'absolute', bottom: -24, left: -20, right: -20, textAlign: 'center', fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                  {drawPile.length} CARDS
              </div>
            </div>

            <div
              ref={deckFlipAnchorRef}
              style={{
                position: 'absolute',
                top: 0,
                left: '100px',
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Event Toast */}
        <AnimatePresence>
          {lastEvent && lastEvent.kind !== 'round_end' && lastEvent.kind !== 'game_over' && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
              transition={{ type: 'spring', damping: 20 }}
              style={{
                background: 'var(--surface-variant)',
                backdropFilter: 'blur(10px)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-full)',
                alignSelf: 'center',
                textAlign: 'center',
                border: '1px solid var(--outline-variant)',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-float)'
              }}
            >
              <strong style={{ color: 'var(--primary)' }}>{players.find((p) => p.id === lastEvent.playerId)?.name}:</strong> {lastEvent.message || (lastEvent.kind === 'card_drawn' ? `Drew ${lastEvent.card?.value || lastEvent.card?.action || lastEvent.card?.modifier}` : lastEvent.kind.replace('_', ' '))}
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
              pendingDrawAnimation={pendingDrawAnimation}
              numberRowRef={registerNumberRowRef(humanPlayer.id)}
              cardsAreaRef={registerCardsAreaRef(humanPlayer.id)}
              incomingSlotRef={registerIncomingSlotRef(humanPlayer.id)}
            />
          </div>
        )}
      </main>

      {pendingDrawAnimation && floatingCardMetrics && (
        <motion.div
          initial={false}
          animate={{
            x: pendingDrawAnimation.phase === 'travel' ? floatingCardMetrics.destination.x : floatingCardMetrics.source.x,
            y: pendingDrawAnimation.phase === 'travel' ? floatingCardMetrics.destination.y : floatingCardMetrics.source.y,
            rotate: 0,
            scale: pendingDrawAnimation.phase === 'spawn' ? 0.985 : 1,
          }}
          transition={
            pendingDrawAnimation.phase === 'travel'
              ? { type: 'tween', duration: 0.56, ease: [0.22, 0.8, 0.2, 1] }
              : { type: 'spring', stiffness: 280, damping: 22, mass: 0.82 }
          }
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <Card
            card={pendingDrawAnimation.card}
            isFaceDown={pendingDrawAnimation.phase === 'spawn'}
            disableIntroAnimation
            flipOrigin="left center"
          />
        </motion.div>
      )}

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
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              style={{
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DebugDumpButton />
    </div>
  );
}

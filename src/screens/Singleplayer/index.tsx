import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../../components/ui/Button';
import { DebugDumpButton } from '../../components/DebugDumpButton';
import type { Difficulty } from '../../engine/types';

export function Singleplayer() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [aiCount, setAiCount] = useState<number>(1);

  function handleStart(difficulty: Difficulty) {
    startGame(difficulty, aiCount);
    navigate('/game');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-6)',
      position: 'relative'
    }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <Button variant="tertiary" onClick={() => navigate('/')} style={{ paddingLeft: 0 }}>
          ← Back
        </Button>
        <h1 style={{ fontSize: '2rem', marginTop: 'var(--space-4)', color: 'var(--on-surface)' }}>
          Game Setup
        </h1>
      </header>

      <section style={{
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-8)'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-body)' }}>
          Opponents
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => setAiCount(num)}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: aiCount === num ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
                background: aiCount === num ? 'var(--surface-container-highest)' : 'var(--surface-container)',
                color: aiCount === num ? 'var(--primary)' : 'var(--on-surface)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {num}
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-body)', fontWeight: 400, marginTop: '0.25rem', color: 'var(--on-surface-variant)' }}>
                {num === 1 ? 'CPU' : 'CPUs'}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section style={{
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        flex: 1,
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-body)' }}>
          Difficulty
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Button variant="secondary" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', justifyContent: 'flex-start' }} onClick={() => handleStart('easy')}>
            🟢 Easy - Casual Play
          </Button>
          <Button variant="secondary" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', justifyContent: 'flex-start' }} onClick={() => handleStart('medium')}>
            🟡 Medium - Standard
          </Button>
          <Button variant="secondary" style={{ background: 'var(--error-container)', color: '#fff', justifyContent: 'flex-start' }} onClick={() => handleStart('hard')}>
            🔴 Hard - Unforgiving
          </Button>
        </div>
      </section>
      <DebugDumpButton />
    </div>
  );
}

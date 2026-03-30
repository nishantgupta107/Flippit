import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { Difficulty } from '../../engine/types';

export function Home() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [aiCount, setAiCount] = useState<number>(1);

  function handleStart(difficulty: Difficulty) {
    startGame(difficulty, aiCount);
    navigate('/game');
  }

  return (
    <div id="home-screen" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🃏 Flip 7</h1>
      <p>Collect 7 unique number cards — or bust trying.</p>
      <hr />
      
      <h2>Opponents</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3].map(num => (
          <button 
            key={num}
            onClick={() => setAiCount(num)}
            style={{ 
              fontWeight: aiCount === num ? 'bold' : 'normal',
              background: aiCount === num ? '#ffe792' : '#eee',
              color: '#000',
              padding: '0.5rem 1rem'
            }}
          >
            {num} {num === 1 ? 'CPU' : 'CPUs'}
          </button>
        ))}
      </div>

      <h2>New Game vs CPU</h2>
      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', maxWidth: 200 }}>
        <button id="btn-easy" onClick={() => handleStart('easy')}>🟢 Easy</button>
        <button id="btn-medium" onClick={() => handleStart('medium')}>🟡 Medium</button>
        <button id="btn-hard" onClick={() => handleStart('hard')}>🔴 Hard</button>
      </div>
    </div>
  );
}

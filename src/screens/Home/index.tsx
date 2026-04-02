// Removed unused React import
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { DebugDumpButton } from '../../components/DebugDumpButton';
import { getPlayerName, setPlayerName } from '../../utils/nameGenerator';

export function Home() {
  const navigate = useNavigate();
  const [playerName, setLocalPlayerName] = useState(getPlayerName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(playerName);

  const handleSaveName = () => {
    setPlayerName(editNameValue);
    setLocalPlayerName(editNameValue);
    setIsEditingName(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top right player name editor */}
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-low)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--outline-variant)' }}>
        {isEditingName ? (
          <>
            <input
              autoFocus
              value={editNameValue}
              onChange={e => setEditNameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              onBlur={handleSaveName}
              style={{ background: 'transparent', border: 'none', color: 'var(--on-surface)', outline: 'none', width: '120px', fontFamily: 'var(--font-body)' }}
              maxLength={15}
            />
            <button onClick={handleSaveName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }}>✓</button>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{playerName}</span>
            <button onClick={() => setIsEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.7 }}>✏️</button>
          </>
        )}
      </div>

      {/* Background ambient light */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80vw',
        height: '80vw',
        background: 'radial-gradient(circle, var(--surface-tint) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
        <h1 style={{
          fontSize: '4rem',
          lineHeight: 1.1,
          textAlign: 'center',
          color: 'var(--primary)',
          marginBottom: 'var(--space-2)'
        }}>
          Flip 7
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--on-surface-variant)',
          textAlign: 'center',
          maxWidth: '300px',
          marginBottom: 'var(--space-20)'
        }}>
          The ultimate game of risk, reward, and pure luck.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', zIndex: 1 }}>
        <Button onClick={() => navigate('/singleplayer')} style={{ width: '100%' }}>
          Play Singleplayer
        </Button>
        <Button variant="secondary" onClick={() => navigate('/multiplayer')} style={{ width: '100%' }}>
          Local Multiplayer (LAN)
        </Button>
        <Button variant="tertiary" style={{ width: '100%' }}>
          How to Play
        </Button>
      </div>
      <DebugDumpButton />
    </div>
  );
}

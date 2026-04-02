// Removed unused React import
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { DebugDumpButton } from '../../components/DebugDumpButton';

export function Home() {
  const navigate = useNavigate();

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

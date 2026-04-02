import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { networkManager } from '../../network/peer';
import { useGameStore } from '../../store/gameStore';
import { DebugDumpButton } from '../../components/DebugDumpButton';

export function MultiplayerLobby() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [joinError, setJoinError] = useState('');

  const setHostStatus = useGameStore(s => s.setHostStatus);

  const startMultiplayerGame = useGameStore(s => s.startMultiplayerGame);

  const handleHost = () => {
    setIsConnecting(true);
    setHostStatus(true);
    networkManager.initHost((id) => {
      setIsConnecting(false);
      navigate(`/game?room=${id}&role=host`);
    }, (clientId) => {
      // Start game when a client joins
      // Host is hardcoded to "human" so they can control, client is clientId
      startMultiplayerGame([
        { id: 'human', name: 'Host' },
        { id: clientId, name: 'Guest' }
      ]);
    });
  };

  const handleJoin = () => {
    if (!roomId) return;
    setIsConnecting(true);
    setJoinError('');
    setHostStatus(false);

    networkManager.joinRoom(
      roomId,
      () => {
        setIsConnecting(false);
        navigate(`/game?room=${roomId}&role=client`);
      },
      (err) => {
        setIsConnecting(false);
        setJoinError('Failed to connect to room. Check the code and try again.');
        console.error(err);
      }
    );
  };

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
          Local Multiplayer (LAN)
        </h1>
      </header>

      <section style={{
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-body)' }}>
          Host a Game
        </h2>
        <p style={{ color: 'var(--on-surface-variant)' }}>
          Create a room and share the code with a friend on the same network.
        </p>
        <Button onClick={handleHost} disabled={isConnecting}>
          {isConnecting ? 'Creating...' : 'Create Room'}
        </Button>
      </section>

      <section style={{
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-body)' }}>
          Join a Game
        </h2>
        <p style={{ color: 'var(--on-surface-variant)' }}>
          Enter a room code to join an existing game.
        </p>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          placeholder="ENTER CODE"
          style={{
            padding: '1rem',
            fontSize: '1.5rem',
            textAlign: 'center',
            textTransform: 'uppercase',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--outline)',
            background: 'var(--surface-container-highest)',
            color: 'var(--on-surface)'
          }}
          maxLength={6}
        />
        {joinError && <p style={{ color: 'var(--error)' }}>{joinError}</p>}
        <Button onClick={handleJoin} disabled={isConnecting || !roomId}>
          {isConnecting ? 'Connecting...' : 'Join Room'}
        </Button>
      </section>

      <DebugDumpButton />
    </div>
  );
}

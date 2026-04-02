import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { networkManager } from '../../network/peer';
import { useGameStore } from '../../store/gameStore';
import { DebugDumpButton } from '../../components/DebugDumpButton';
import { getPlayerName } from '../../utils/nameGenerator';

type LobbyState = 'menu' | 'host_lobby' | 'client_join';

export function MultiplayerLobby() {
  const navigate = useNavigate();
  const [lobbyState, setLobbyState] = useState<LobbyState>('menu');
  const [roomId, setRoomId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [connectedPlayers, setConnectedPlayers] = useState<{id: string, name: string}[]>([]);

  const setHostStatus = useGameStore(s => s.setHostStatus);
  const startMultiplayerGame = useGameStore(s => s.startMultiplayerGame);

  const handleHost = () => {
    setIsConnecting(true);
    setHostStatus(true);

    const hostName = getPlayerName();

    networkManager.initHost((id) => {
      setIsConnecting(false);
      setRoomId(id);
      setLobbyState('host_lobby');
      setConnectedPlayers([{ id: 'human', name: hostName }]); // Add self to list
    }, (clientId, clientName) => {
      // Add client to the list when they join
      setConnectedPlayers(prev => [...prev, { id: clientId, name: clientName }]);
    }, (clientId) => {
      // Remove client when they leave
      setConnectedPlayers(prev => prev.filter(p => p.id !== clientId));
    });
  };

  const startGame = () => {
    startMultiplayerGame(connectedPlayers);
    navigate(`/game?room=${roomId}&role=host`);
  };

  const handleJoin = () => {
    if (!roomId) return;
    setIsConnecting(true);
    setJoinError('');
    setHostStatus(false);

    setLobbyState('client_join');

    networkManager.joinRoom(
      roomId,
      getPlayerName(),
      () => {
        setIsConnecting(false);
      },
      (err) => {
        setIsConnecting(false);
        setJoinError('Failed to connect to room. Check the code and try again.');
        setLobbyState('menu');
        console.error(err);
      }
    );
  };

  // Client side: watch for game state to populate, meaning host started the game
  const gameState = useGameStore(s => s.gameState);
  useEffect(() => {
    if (lobbyState === 'client_join' && gameState) {
      navigate(`/game?room=${roomId}&role=client`);
    }
  }, [lobbyState, gameState, navigate, roomId]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-6)',
      position: 'relative'
    }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <Button variant="tertiary" onClick={() => {
          if (lobbyState !== 'menu') {
            networkManager.disconnect();
            setLobbyState('menu');
            setConnectedPlayers([]);
          } else {
            navigate('/');
          }
        }} style={{ paddingLeft: 0 }}>
          ← Back
        </Button>
        <h1 style={{ fontSize: '2rem', marginTop: 'var(--space-4)', color: 'var(--on-surface)' }}>
          Local Multiplayer (LAN)
        </h1>
      </header>

      {lobbyState === 'menu' && (
        <>
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
        </>
      )}

      {lobbyState === 'host_lobby' && (
        <section style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-body)' }}>
            Room Created!
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', textAlign: 'center' }}>
            Share this code with your friends:
          </p>
          <div style={{
            fontSize: '3rem',
            letterSpacing: '0.2em',
            padding: '1rem 2rem',
            background: 'var(--surface-container-highest)',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--primary)',
            fontFamily: 'var(--font-display)',
            color: 'var(--primary)'
          }}>
            {roomId}
          </div>

          <div style={{ width: '100%', marginTop: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Connected Players ({connectedPlayers.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {connectedPlayers.map(p => (
                <li key={p.id} style={{ padding: '0.75rem', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.name}</span>
                  {p.id === 'human' && <span style={{ color: 'var(--primary)' }}>(You)</span>}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 'auto', width: '100%' }}>
            <Button style={{ width: '100%' }} onClick={startGame} disabled={connectedPlayers.length < 2}>
              Start Game
            </Button>
          </div>
        </section>
      )}

      {lobbyState === 'client_join' && (
        <section style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
             width: 48, height: 48, border: '4px solid var(--surface-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
            {isConnecting ? 'Connecting to Room...' : 'Waiting for Host to start...'}
          </h2>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </section>
      )}

      <DebugDumpButton />
    </div>
  );
}

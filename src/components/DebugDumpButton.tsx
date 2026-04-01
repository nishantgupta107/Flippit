import { useState } from 'react';
import { dumpLogsToServer, getLogs } from '../utils/eventLogger.ts';

export function DebugDumpButton() {
  const [isDumping, setIsDumping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDump = async () => {
    const logs = getLogs();
    if (logs.length === 0) {
      setMessage('No logs to dump');
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    setIsDumping(true);
    setMessage('Dumping...');

    const result = await dumpLogsToServer();
    
    setIsDumping(false);
    setMessage(result.success ? `Dumped ${logs.length} logs` : 'Dump failed');
    
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}
    >
      {message && (
        <div
          style={{
            backgroundColor: message.includes('failed') ? '#ef4444' : '#22c55e',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {message}
        </div>
      )}
      <button
        onClick={handleDump}
        disabled={isDumping}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isDumping ? '#9ca3af' : '#3b82f6',
          color: 'white',
          fontSize: '20px',
          cursor: isDumping ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.1s, background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isDumping) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = '#2563eb';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = isDumping ? '#9ca3af' : '#3b82f6';
        }}
        title="Dump logs to server"
      >
        📝
      </button>
    </div>
  );
}

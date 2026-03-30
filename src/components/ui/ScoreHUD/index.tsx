// Removed unused React import

interface ScoreHUDProps {
  score: number;
  delta?: number;
  label?: string;
  className?: string;
}

export function ScoreHUD({ score, delta, label = 'Total', className = '' }: ScoreHUDProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface-variant)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))', /* Safari support */
        borderRadius: 'var(--radius-xl)',
        padding: '0.75rem 1.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        border: '1px solid var(--outline-variant)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ 
          fontSize: '0.6875rem', 
          fontWeight: 600, 
          letterSpacing: '0.05em', 
          textTransform: 'uppercase',
          color: 'var(--on-surface-variant)' 
        }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--primary)',
            lineHeight: 1
          }}>
            {score}
          </span>
          {delta !== undefined && delta !== 0 && (
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: delta > 0 ? 'var(--primary)' : 'var(--error)'
            }}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

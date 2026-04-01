import { motion, AnimatePresence } from 'framer-motion';

interface ScoreHUDProps {
  score: number;
  delta?: number;
  label?: string;
  className?: string;
}

function RollingDigit({ digit }: { digit: string }) {
  if (isNaN(parseInt(digit))) {
    return <span>{digit}</span>;
  }
  
  const num = parseInt(digit);
  
  return (
    <div style={{ height: '1.5rem', overflow: 'hidden', position: 'relative', width: '0.85em' }}>
      <motion.div
        initial={false}
        animate={{ y: `-${num * 10}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {i}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function RollingNumber({ value }: { value: number }) {
  const digits = value.toString().split('');
  return (
    <div style={{ display: 'inline-flex', overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="popLayout">
        {digits.map((d, i) => (
          <motion.div 
            key={digits.length - i}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <RollingDigit digit={d} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
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
            <RollingNumber value={score} />
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

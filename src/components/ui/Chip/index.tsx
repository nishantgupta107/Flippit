// Removed unused React import

type ChipVariant = 'multiplier' | 'action' | 'outline';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
}

export function Chip({ label, variant = 'multiplier' }: ChipProps) {
  let bg = 'var(--tertiary)';
  let color = '#001f33'; // Deep contrast for the cyan
  let border = 'none';

  if (variant === 'action') {
    bg = 'var(--secondary)';
    color = '#fff';
  } else if (variant === 'outline') {
    bg = 'transparent';
    color = 'var(--on-surface-variant)';
    border = '1px solid var(--outline-variant)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: color,
        border: border,
        borderRadius: 'var(--radius-full)',
        padding: '0.25rem 0.75rem',
        fontFamily: variant === 'multiplier' ? 'var(--font-display)' : 'var(--font-body)',
        fontWeight: variant === 'multiplier' ? 700 : 600,
        fontSize: '0.875rem',
        boxShadow: variant !== 'outline' ? 'var(--shadow-float)' : 'none',
      }}
    >
      {label}
    </span>
  );
}

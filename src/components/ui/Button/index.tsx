import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', style, children, disabled, ...props }: ButtonProps) {
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.2s ease',
  } as const;

  const variants = {
    primary: {
      background: 'var(--primary-gradient)',
      color: 'var(--on-primary-fixed)',
      borderRadius: 'var(--radius-full)',
      padding: '0.75rem 1.5rem',
      fontWeight: 700,
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',
    },
    secondary: {
      background: 'var(--secondary)',
      color: '#fff',
      borderRadius: 'var(--radius-lg)',
      padding: '0.75rem 1.5rem',
      fontWeight: 700,
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--on-surface-variant)',
      borderRadius: 'var(--radius-md)',
      padding: '0.5rem 1rem',
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem', /* label-md */
    },
  };

  const combinedStyle = { ...baseStyles, ...variants[variant], ...style };

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.95 }}
      style={combinedStyle}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}

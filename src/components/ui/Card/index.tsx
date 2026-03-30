// Removed unused React import
import { motion } from 'framer-motion';
import type { Card as CardType } from '../../../engine/types';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ card, isFaceDown, onClick, style, className = '' }: CardProps) {
  // Dimensions and base styling
  const baseStyle: React.CSSProperties = {
    width: 'var(--card-width, 80px)',
    aspectRatio: '5 / 7',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-float)',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    border: '1px solid var(--outline-variant)',
    ...style,
  };

  if (isFaceDown || !card) {
    return (
      <motion.div
        className={className}
        style={{
          ...baseStyle,
          background: 'var(--surface-bright)',
          border: '1px solid var(--outline-variant)',
        }}
        onClick={onClick}
        whileHover={onClick ? { y: -5 } : {}}
      >
        {/* Card back design: subtle pattern or logo */}
        <div style={{
          width: '60%',
          height: '60%',
          borderRadius: '50%',
          border: '2px solid var(--surface-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--surface-variant)', fontSize: '1.5rem', fontWeight: 700 }}>F7</span>
        </div>
      </motion.div>
    );
  }

  // Face-up content styles based on type
  let content = null;
  let bg = 'var(--surface-container-highest)';
  
  if (card.type === 'number') {
    content = (
      <>
        <span style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '2.5rem', 
          fontWeight: 700, 
          color: 'var(--primary)',
          lineHeight: 1
        }}>
          {card.value}
        </span>
      </>
    );
  } else if (card.type === 'modifier') {
    content = (
      <>
        <span style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '1.5rem', 
          fontWeight: 700, 
          color: 'var(--tertiary)',
          lineHeight: 1
        }}>
          {card.modifier}
        </span>
        <span style={{ 
          fontFamily: 'var(--font-body)', 
          fontSize: '0.6875rem', 
          color: 'var(--on-surface-variant)',
          marginTop: '0.25rem',
          textTransform: 'uppercase'
        }}>
          Modifier
        </span>
      </>
    );
  } else if (card.type === 'action') {
    bg = 'var(--surface-container-high)'; // slightly different tint for actions
    const actionNames: Record<string, string> = {
      'freeze': 'Freeze',
      'flip_three': 'Flip 3',
      'second_chance': '2nd Chance'
    };
    content = (
      <>
        <span style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          color: 'var(--secondary)',
          lineHeight: 1,
          textAlign: 'center'
        }}>
          {actionNames[card.action!] || card.action}
        </span>
      </>
    );
  }

  return (
    <motion.div
      className={className}
      style={{
        ...baseStyle,
        background: bg,
      }}
      onClick={onClick}
      whileHover={onClick ? { y: -5 } : { y: 0 }}
      layout
    >
      {/* Corner index (top left) */}
      <div style={{
        position: 'absolute',
        top: '4px',
        left: '6px',
        fontFamily: 'var(--font-display)',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: card.type === 'number' ? 'var(--primary)' : 
               card.type === 'action' ? 'var(--secondary)' : 'var(--tertiary)'
      }}>
        {card.type === 'number' ? card.value : ''}
      </div>

      {content}

      {/* Subtle bottom fade/gradient */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
        pointerEvents: 'none',
      }} />
    </motion.div>
  );
}

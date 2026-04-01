// Removed unused React import
import { motion } from 'framer-motion';
import type { Card as CardType, PlayerState as PlayerType } from '../../../engine/types';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  status?: PlayerType['status'];
}

export function Card({ card, isFaceDown, onClick, style, className = '', status }: CardProps) {
  // Dimensions and base styling
  const baseStyle: React.CSSProperties = {
    width: 'var(--card-width, 80px)',
    aspectRatio: '5 / 7',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    userSelect: 'none',
    perspective: 1000,
    ...style,
  };

  const backSideContent = (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-bright)',
        border: '1px solid var(--outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
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
    </div>
  );

  if (!card) {
    return (
      <motion.div
        className={className}
        style={baseStyle}
        onClick={onClick}
        whileHover={onClick ? { y: -5 } : {}}
        layout
      >
        <div style={{ width: '100%', height: '100%' }}>
           {backSideContent}
        </div>
      </motion.div>
    );
  }

  // Face-up content styles based on type
  let content = null;
  let bg = 'var(--surface-container-highest)';
  const isBusted = status === 'busted';
  const isFrozen = status === 'frozen';
  
  const faceFilter = isBusted ? 'sepia(1) hue-rotate(-50deg) saturate(5)' : isFrozen ? 'sepia(1) hue-rotate(180deg) saturate(3)' : undefined;
  
  if (card.type === 'number') {
    content = (
      <>
        <span style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '2.5rem', 
          fontWeight: 700, 
          color: isBusted ? 'var(--error)' : 'var(--primary)',
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
      style={baseStyle}
      onClick={onClick}
      whileHover={onClick ? { y: -5 } : { y: 0 }}
      layout
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        boxShadow: isBusted ? '0 0 15px var(--error)' : 'var(--shadow-float)'
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <motion.div
        initial={{ rotateY: 180 }}
        animate={{ rotateY: isFaceDown ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* FRONT SIDE */}
        <motion.div 
          animate={{ filter: faceFilter || 'none' }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: bg,
            borderRadius: 'var(--radius-md)',
            border: isBusted ? '2px solid var(--error)' : '1px solid var(--outline-variant)',
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            zIndex: isFaceDown ? 0 : 1
          }}
        >
          {/* Corner index (top left) */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: card.type === 'number' ? (isBusted ? 'var(--error)' : 'var(--primary)') : 
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
        
        {/* BACK SIDE */}
        <div style={{
           position: 'absolute',
           inset: 0,
           backfaceVisibility: 'hidden',
           WebkitBackfaceVisibility: 'hidden',
           transform: 'rotateY(180deg)',
           zIndex: isFaceDown ? 1 : 0
        }}>
           {backSideContent}
        </div>
      </motion.div>
    </motion.div>
  );
}

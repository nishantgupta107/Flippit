import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { Card as CardType, PlayerState as PlayerType } from '../../../engine/types';
import { DRAW_FLIP_DURATION_MS } from '../../../store/drawAnimation';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  status?: PlayerType['status'];
  disableIntroAnimation?: boolean;
  flipOrigin?: CSSProperties['transformOrigin'];
  isBustCard?: boolean;
}

export function Card({
  card,
  isFaceDown,
  onClick,
  style,
  className = '',
  status,
  disableIntroAnimation = false,
  flipOrigin = 'center center',
  isBustCard = false,
}: CardProps) {
  // Dimensions and base styling
  const baseStyle: CSSProperties = {
    width: 'var(--card-width, 80px)',
    aspectRatio: '5 / 7',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    userSelect: 'none',
    perspective: 1000,
    perspectiveOrigin: flipOrigin,
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
  
  const faceFilter = (isBusted || isBustCard) ? 'sepia(1) hue-rotate(-50deg) saturate(5)' : undefined;
  
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
      initial={disableIntroAnimation ? false : { scale: 0.5, opacity: 0 }}
      animate={
        disableIntroAnimation
          ? { 
              boxShadow: (isBusted || isBustCard) ? '0 0 15px var(--error)' : 'var(--shadow-float)',
            }
          : {
              scale: 1,
              opacity: 1,
              boxShadow: (isBusted || isBustCard) ? '0 0 15px var(--error)' : 'var(--shadow-float)',
            }
      }
      transition={
        disableIntroAnimation
          ? { duration: 0.2 }
          : { type: 'spring', stiffness: 260, damping: 20 }
      }
    >
      <motion.div
        initial={false}
        animate={{ rotateY: isFaceDown ? 180 : 0 }}
        transition={{ duration: DRAW_FLIP_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transformOrigin: flipOrigin,
        }}
      >
        {/* FRONT SIDE */}
        <motion.div 
          animate={{ filter: faceFilter || 'none' }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: (isBusted || isBustCard) ? 'var(--error-container)' : bg,
            borderRadius: 'var(--radius-md)',
            border: (isBusted || isBustCard) ? '2px solid var(--error)' : '1px solid var(--outline-variant)',
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
          {/* Advanced Freeze Overlay */}
          <motion.div
            initial={false}
            animate={{ 
              opacity: isFrozen ? 0.95 : 0,
              backgroundSize: isFrozen 
                ? '100% 60%, 60% 100%, 100% 30%, 30% 100%' 
                : '100% 0%, 0% 100%, 100% 0%, 0% 100%'
            }}
            transition={{ 
              backgroundSize: { duration: 1.1, ease: 'easeOut' },
              opacity: { duration: 0.5 }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
              backgroundImage: `
                linear-gradient(to bottom, rgba(220,240,255,0.85), transparent),
                linear-gradient(to right, rgba(220,240,255,0.8), transparent),
                linear-gradient(to top, rgba(220,240,255,0.5), transparent),
                linear-gradient(to left, rgba(220,240,255,0.6), transparent)
              `,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top left, top left, bottom right, bottom right',
              filter: 'blur(4px)',
              WebkitMaskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
              maskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
            }}
          />

          {/* Ice texture */}
          <motion.div
            initial={false}
            animate={{ opacity: isFrozen ? 0.4 : 0 }}
            transition={{ duration: 1, delay: isFrozen ? 0.6 : 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 3,
              backgroundImage: "url('https://images.unsplash.com/photo-1577481759269-e704c1871a26')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              mixBlendMode: 'screen',
            }}
          />

          {/* Shine Sweep */}
          <motion.div
            initial={false}
            animate={{ x: isFrozen ? '100%' : '-100%' }}
            transition={{ duration: 1.2, delay: isFrozen ? 1.2 : 0, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 4,
              background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4), transparent 70%)',
            }}
          />
          {/* Corner index (top left) */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: card.type === 'number' ? ((isBusted || isBustCard) ? 'var(--on-surface)' : 'var(--primary)') : 
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

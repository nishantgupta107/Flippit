import { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { Card as CardType } from '../../engine/types';
import { DRAW_FLIP_DURATION_MS } from '../../store/drawAnimation';
import { colors, radius } from '../../constants/theme';
import { rem } from '../../utils/scaling';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  style?: ViewStyle;
  status?: string;
  disableIntroAnimation?: boolean;
  isBustCard?: boolean;
}

export function Card({
  card,
  isFaceDown = false,
  style,
  status,
  disableIntroAnimation = false,
  isBustCard = false,
}: CardProps) {
  const flipAnim = useSharedValue(isFaceDown ? 180 : 0);
  const scaleAnim = useSharedValue(disableIntroAnimation ? 1 : 0.5);
  const opacityAnim = useSharedValue(disableIntroAnimation ? 1 : 0);

  useEffect(() => {
    if (isFaceDown) {
      flipAnim.value = 180;
    } else {
      flipAnim.value = withTiming(0, { duration: DRAW_FLIP_DURATION_MS || 400 });
    }
  }, [isFaceDown, flipAnim]);

  useEffect(() => {
    if (!disableIntroAnimation) {
      scaleAnim.value = withSpring(1, { stiffness: 260, damping: 20 });
      opacityAnim.value = withTiming(1, { duration: 200 });
    }
  }, [disableIntroAnimation, scaleAnim, opacityAnim]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleAnim.value }
      ],
      opacity: opacityAnim.value,
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    return {
      transform: [

        { rotateY: `${flipAnim.value}deg` }

      ],
      zIndex: flipAnim.value < 90 ? 1 : 0,
      opacity: flipAnim.value < 90 ? 1 : 0, // Fallback for Android backfaceVisibility
    };
  });

  const backStyle = useAnimatedStyle(() => {
    return {
      transform: [

        { rotateY: `${flipAnim.value + 180}deg` }

      ],
      zIndex: flipAnim.value >= 90 ? 1 : 0,
      opacity: flipAnim.value >= 90 ? 1 : 0, // Fallback for Android backfaceVisibility
    };
  });

  const isBusted = status === 'busted';
  const showBustedStyle = isBusted || isBustCard;

  const backSideContent = (
    <View style={styles.backContainer}>
      <View style={styles.backCircle}>
        <Text style={styles.backText}>F7</Text>
      </View>
    </View>
  );

  if (!card) {
    return (
      <Animated.View style={[styles.baseContainer, style, animatedStyle]}>
        {backSideContent}
      </Animated.View>
    );
  }

  let content = null;
  let bg: string = colors.surfaceContainerHighest;
  let cornerColor: string = colors.tertiary;

  if (card.type === 'NUMBER') {
    cornerColor = showBustedStyle ? colors.onSurface : colors.primary;
    content = (
      <Text style={[styles.numberText, { color: showBustedStyle ? colors.error : colors.primary }]}>
        {card.value}
      </Text>
    );
  } else if (card.type === 'MODIFIER_MULT' || card.type === 'MODIFIER_BONUS') {
    cornerColor = colors.tertiary;
    content = (
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.modifierText}>
          {card.type === 'MODIFIER_MULT' ? `x${card.value}` : `+${card.value}`}
        </Text>
        <Text style={styles.modifierLabel}>Modifier</Text>
      </View>
    );
  } else if (card.type === 'ACTION_FREEZE' || card.type === 'ACTION_FLIP_THREE' || card.type === 'ACTION_SECOND_CHANCE') {
    bg = colors.surfaceContainerHigh;
    cornerColor = colors.secondary;
    const actionNames: Record<string, string> = {
      'ACTION_FREEZE': 'Freeze',
      'ACTION_FLIP_THREE': 'Flip 3',
      'ACTION_SECOND_CHANCE': '2nd Chance'
    };
    content = (
      <Text style={styles.actionText}>
        {actionNames[card.type]}
      </Text>
    );
  }

  return (
    <Animated.View style={[styles.baseContainer, style, animatedStyle]}>
      {/* FRONT SIDE */}
      <Animated.View style={[
        styles.faceContainer,
        frontStyle,
        {
          backgroundColor: showBustedStyle ? colors.errorContainer : bg,
          borderColor: showBustedStyle ? colors.error : colors.outlineVariant,
        }
      ]}>
        <Text style={[styles.cornerIndex, { color: cornerColor }]}>
          {card.type === 'NUMBER' ? card.value : ''}
        </Text>

        {content}
      </Animated.View>

      {/* BACK SIDE */}
      <Animated.View style={[styles.faceContainer, backStyle, styles.backFaceContainer]}>
        {backSideContent}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    width: rem(5), // roughly 80px depending on scaling
    aspectRatio: 5 / 7,
    position: 'relative',
  },
  faceContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFaceContainer: {
    borderWidth: 0,
  },
  backContainer: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceBright,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: '60%',
    height: '60%',
    borderRadius: 100, // Make it a circle
    borderWidth: 2,
    borderColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: 'NotoSerif-Bold',
    color: colors.surfaceVariant,
    fontSize: rem(1.5),
    fontWeight: 'bold',
  },
  cornerIndex: {
    position: 'absolute',
    top: rem(0.25),
    left: rem(0.375),
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(0.75),
    fontWeight: 'bold',
  },
  numberText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(2.5),
    fontWeight: 'bold',
    lineHeight: rem(2.5),
  },
  modifierText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.5),
    fontWeight: 'bold',
    color: colors.tertiary,
    lineHeight: rem(1.5),
  },
  modifierLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: rem(0.6875),
    color: colors.onSurfaceVariant,
    marginTop: rem(0.25),
    textTransform: 'uppercase',
  },
  actionText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.25),
    fontWeight: 'bold',
    color: colors.secondary,
    lineHeight: rem(1.25),
    textAlign: 'center',
  },
});
import { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../constants/theme';

const PARTICLE_COUNT = 30;

function Particle({ width, height }: { width: number; height: number }) {
  const initialX = Math.random() * width;
  const initialY = -50;

  const translateY = useSharedValue(initialY);
  const translateX = useSharedValue(initialX);
  const rotation = useSharedValue(0);

  const size = Math.random() * 15 + 5;
  const colorList = [colors.primary, colors.secondary, colors.tertiary];
  const color = colorList[Math.floor(Math.random() * colorList.length)];
  const isCircle = Math.random() > 0.5;

  useEffect(() => {
    const duration = Math.random() * 2000 + 2000;
    const delay = Math.random() * 2000;

    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(height + 50, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialX + 50, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(initialX - 50, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true
      )
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [height, initialX, rotation, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  return (
    <Animated.View style={[
      styles.particle,
      animatedStyle,
      {
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: isCircle ? size / 2 : 2
      }
    ]} />
  );
}

export function Flip7Celebration() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  }
});
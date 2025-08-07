import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import Animated, {
  withSequence,
  withTiming,
  withRepeat,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';

const useLoadingDots = () => {

  // Reanimated shared value
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  //dots style 
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));
  // Start typing dots animation
  const startTypingAnimation = () => {
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot2Opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 200 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 200 })
      ),
      -1,
      false
    );

    dot3Opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 200 })
      ),
      -1,
      false
    );
  };

  const LoadingDots = () => {
    return (
      <View style={styles.container}>
        <View style={styles.messageContent}>
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <Animated.View style={[styles.typingDot, dot1Style]} />
              <Animated.View style={[styles.typingDot, dot2Style]} />
              <Animated.View style={[styles.typingDot, dot3Style]} />
            </View>
          </View>
        </View>
      </View>
    )
  }

  return {
    startTypingAnimation,
    LoadingDots
  };

}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  contentContainer: {
    paddingBottom: 12,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
 
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8e8ea0',
  },
  
});

export default useLoadingDots
// src/components/chatUI/ScrollToBottomButton.tsx

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Colors } from '@/src/constants/Colors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';

type Props = {
  onPress: () => void;
  visible: boolean;
};

const ScrollToBottomButton: React.FC<Props> = ({ onPress, visible }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withTiming(visible ? 1 : 0.9, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
        <Feather name="chevron-down" size={24} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignSelf: 'center',
    bottom: 50,
    zIndex: 10,
  },
  button: {
    backgroundColor: Colors.dark.button,
    borderRadius: 50,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default ScrollToBottomButton;

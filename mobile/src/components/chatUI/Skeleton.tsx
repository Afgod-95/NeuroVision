import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const SkeletonMessage = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.titleBar, { transform: [{ scaleX: scaleAnim }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  titleBar: {
    height: 16,
    width: '70%',
    backgroundColor: '#2e2e2e',
    borderRadius: 4,
  },
});

export default SkeletonMessage;

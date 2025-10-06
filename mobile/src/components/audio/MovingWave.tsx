import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/constants/Colors";

const { width } = Dimensions.get("window");
const NUM_BARS = 200;
const BAR_WIDTH = 4;
const BAR_SPACING = 1;
const SCROLL_DURATION = 15000;
const BAR_MIN = 0.4;
const BAR_MAX = 1.6;
const TOTAL_WIDTH = NUM_BARS * (BAR_WIDTH + BAR_SPACING);

export default function MovingWaveform() {
  const translateX = useSharedValue(width);
  const scales = Array.from({ length: NUM_BARS }, () => useSharedValue(1));

  const barStyles = scales.map((sv) =>
    useAnimatedStyle(() => ({
      transform: [{ scaleY: sv.value }],
    }))
  );

  const waveformStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    // continuous scrolling loop
    translateX.value = withRepeat(
      withTiming(-TOTAL_WIDTH, {
        duration: SCROLL_DURATION,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // animate bar bounces
    scales.forEach((sv, i) => {
      sv.value = withDelay(
        i * 30,
        withRepeat(
          withTiming(Math.random() * (BAR_MAX - BAR_MIN) + BAR_MIN, {
            duration: 600 + Math.random() * 600,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    });
  }, []);

  return (
    <>

      {/* Waveform */}
      <View style={styles.container}>
        {/* Left fade */}
        <LinearGradient
          colors={["#121212", "transparent"]}
          style={[styles.gradient, { left: 0 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        {/* Right fade */}
        <LinearGradient
          colors={["transparent", "#121212"]}
          style={[styles.gradient, { right: 0 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <Animated.View style={[styles.waveform, waveformStyle]}>
          {barStyles.map((style, i) => (
            <Animated.View key={i} style={[styles.bar, style]} />
          ))}
        </Animated.View>
      </View>
    </>
      
  );
}

const styles = StyleSheet.create({

  container: {
    height: 40,
    flex: 1,
    borderRadius: 50,
    backgroundColor: Colors.dark.bgPrimary,
    overflow: "hidden",
    justifyContent: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    width: TOTAL_WIDTH,
  },
  bar: {
    width: BAR_WIDTH,
    height: 12,
    borderRadius: 2,
    marginRight: BAR_SPACING,
    backgroundColor: Colors.dark.txtPrimary,
  },
  gradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 50,
    zIndex: 10,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MotiView, MotiText } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { Brain } from "lucide-react-native";
import { Colors } from "@/src/constants/Colors";

const CustomSplashScreen = () => {
  return (
    <LinearGradient
      colors={[Colors.dark.bgPrimary, "#12001A"]}
      style={styles.container}
    >
      {/* Pulsing ring */}
      <MotiView
        from={{ scale: 0.9, opacity: 0.5 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{
          loop: true,
          repeatReverse: false,
          duration: 2000,
        }}
        style={styles.pulseRing}
      />

      {/* Brain Icon */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        style={styles.iconContainer}
      >
        <Brain size={64} color={Colors.dark.txtPrimary} />
      </MotiView>

      {/* App Name */}
      <MotiText
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 800 }}
        style={styles.title}
      >
        NeuroVision
      </MotiText>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.dark.txtPrimary,
  },
  iconContainer: {
    zIndex: 1,
  },
  title: {
    marginTop: 20,
    fontSize: 26,
    fontFamily: "Manrope-ExtraBold",
    color: Colors.dark.txtPrimary,
  },
});

export default CustomSplashScreen;

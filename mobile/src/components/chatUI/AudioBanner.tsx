import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  runOnJS,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';

import {
  useAudioPlayer,           // expo-audio hook
  useAudioPlayerStatus,     // keeps status in sync
} from 'expo-audio';

const BANNER_HEIGHT = 70;

interface SpeechBannerProps {
  /** Audio URL (e.g. ElevenLabs MP3) */
  audioUrl: string;
  /** Banner message to display */
  message: string;
  /** Show/hide banner */
  visible: boolean;
  /** Auto-dismiss when playback finishes (default true) */
  autoDismiss?: boolean;
  /** Called after banner slides away */
  onClose: () => void;
}

const SpeechBanner: React.FC<SpeechBannerProps> = ({
  audioUrl,
  message,
  visible,
  autoDismiss = true,
  onClose,
}) => {
  /* -------------------- audio -------------------- */
  const player = useAudioPlayer({ uri: audioUrl });
  const status = useAudioPlayerStatus(player);

  /* -------------------- animation state -------------------- */
  const translateY = useSharedValue(-BANNER_HEIGHT);
  const progress = useSharedValue(0);
  const wave1 = useSharedValue(0.3);
  const wave2 = useSharedValue(0.3);
  const wave3 = useSharedValue(0.3);

  const [mounted, setMounted] = useState(false); // prevents double hide

  /* -------------------- enter / exit -------------------- */
  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      player.play(); // start audio
    } else {
      hide();
    }
  }, [visible]);

  /* -------------------- update progress & waveform -------------------- */
  useEffect(() => {
    if (!status) return;

    // progress bar
    if (status.duration > 0) {
      progress.value = withTiming(status.currentTime / status.duration);
    }

    // waveform animation
    if (status.playing) startWave();
    else stopWave();

    // finished?
    if (
      !status.playing &&
      status.currentTime  >= status.duration &&
      status.duration !== 0
    ) {
      if (autoDismiss) hide();
    }
  }, [status]);

  /* -------------------- wave helpers -------------------- */
  const startWave = () => {
    wave1.value = withRepeat(withTiming(1.2, { duration: 600 }), -1, true);
    wave2.value = withRepeat(withTiming(1.6, { duration: 500 }), -1, true);
    wave3.value = withRepeat(withTiming(1.3, { duration: 700 }), -1, true);
  };
  const stopWave = () => {
    cancelAnimation(wave1);
    cancelAnimation(wave2);
    cancelAnimation(wave3);
    wave1.value = withTiming(0.3);
    wave2.value = withTiming(0.3);
    wave3.value = withTiming(0.3);
  };

  /* -------------------- hide -------------------- */
  const hide = () => {
    if (!mounted) return;
    translateY.value = withTiming(
      -BANNER_HEIGHT - 10,
      { duration: 250, easing: Easing.in(Easing.cubic) },
      (finished) => finished && runOnJS(onClose)(),
    );
    setMounted(false);
    player.pause();
    stopWave();
  };

  /* -------------------- controls -------------------- */
  const togglePlay = () => (status?.playing ? player.pause() : player.play());
  const stop = () => hide();

  /* -------------------- animated styles -------------------- */
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  const w1 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave1.value }] }));
  const w2 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave2.value }] }));
  const w3 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave3.value }] }));

  /* -------------------- render -------------------- */
  return (
    <PanGestureHandler onGestureEvent={({ nativeEvent }) => {
      if (nativeEvent.translationY < -30) hide();
    }}>
      <Animated.View style={[styles.banner, containerStyle]}>
        {/* progress bar */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, progressStyle]} />
        </View>

        {/* content */}
        <View style={styles.row}>
          {/* text + wave */}
          <View style={styles.textWrap}>
            <Text style={styles.text} numberOfLines={2}>{message}</Text>
            <View style={styles.waveRow}>
              <Animated.View style={[styles.wave, w1]} />
              <Animated.View style={[styles.wave, w2]} />
              <Animated.View style={[styles.wave, w3]} />
              <Animated.View style={[styles.wave, w2]} />
              <Animated.View style={[styles.wave, w1]} />
            </View>
          </View>

          {/* controls */}
          <View style={styles.controls}>
            <Text style={styles.btn} onPress={togglePlay}>
              {status?.playing ? '⏸️' : '▶️'}
            </Text>
            <Text style={styles.stop} onPress={stop}>⏹</Text>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default SpeechBanner;

/* -------------------- styles -------------------- */
const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: BANNER_HEIGHT,
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    marginTop: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    zIndex: 9999,
  },
  track: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fill: {
    height: '100%',
    backgroundColor: '#10A37F',
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 },
  textWrap: { flex: 1, marginRight: 12 },
  text: { color: '#FFFFFF', fontSize: 14, marginBottom: 4 },
  waveRow: { flexDirection: 'row', alignItems: 'center', height: 16, gap: 2 },
  wave: { width: 3, height: 8, backgroundColor: '#10A37F', borderRadius: 1.5 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { fontSize: 16, color: '#FFFFFF', padding: 4 },
  stop: { fontSize: 16, color: '#FF6B6B', padding: 4 },
});

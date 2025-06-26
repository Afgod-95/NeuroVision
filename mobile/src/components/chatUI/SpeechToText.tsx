// AudioBanner.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  AudioPlayer,
} from 'expo-audio';   // ✅ expo-audio ≥ 0.4.x

interface AudioBannerProps {
  /** ElevenLabs (or any) audio URL */
  audioUrl: string;
  /** Original text – shown under the waveform */
  text?: string;
  /** Hide automatically when playback ends (default true) */
  autoDismiss?: boolean;
  /** Called after the banner slides away */
  onDone?: () => void;
}

const BANNER_HEIGHT = 72;

export const AudioBanner: React.FC<AudioBannerProps> = ({
  audioUrl = "https://www.boomplay.com/songs/5792431?from=artists",
  text,
  autoDismiss = true,
  onDone,
}) => {
  /* ------------------------------------------------------------------ */
  /*  Audio                                                             */
  /* ------------------------------------------------------------------ */
  const player = useAudioPlayer({ uri: audioUrl });
  const status = useAudioPlayerStatus(player); 

  /* ------------------------------------------------------------------ */
  /*  UI / animation state                                              */
  /* ------------------------------------------------------------------ */
  const translateY = useSharedValue(-BANNER_HEIGHT);
  const progress = useSharedValue(0); // 0–1
  const wave1 = useSharedValue(0.3);
  const wave2 = useSharedValue(0.3);
  const wave3 = useSharedValue(0.3);

  const [visible, setVisible] = useState(true);

  /* ------------------------------------------------------------------ */
  /*  Effects                                                           */
  /* ------------------------------------------------------------------ */

  // Slide-in on mount
  useEffect(() => {
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, []);

  // Drive progress + waveform from playback status
  useEffect(() => {
    if (!status) return;

    // progress bar
    if (status.duration > 0) {
      progress.value = withTiming((status.duration ?? 0) / status.duration);
    }

    // waveform
    if (status.playing) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }

    // finished?
    if (
      !status.playing &&
      (status.duration ?? 0) >= status.duration &&
      status.duration !== 0
    ) {
      handleFinished();
    }
  }, [status]);

  // Clean-up on unmount
  useEffect(() => () => player.pause(), []);

  /* ------------------------------------------------------------------ */
  /*  Wave helpers                                                      */
  /* ------------------------------------------------------------------ */
  const startWaveAnimation = () => {
    wave1.value = withRepeat(withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true);
    wave2.value = withRepeat(withTiming(1.6, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true);
    wave3.value = withRepeat(withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  };

  const stopWaveAnimation = () => {
    cancelAnimation(wave1);
    cancelAnimation(wave2);
    cancelAnimation(wave3);
    wave1.value = withTiming(0.3);
    wave2.value = withTiming(0.3);
    wave3.value = withTiming(0.3);
  };

  const handleFinished = () => {
    if (!autoDismiss || !visible) return;
    setVisible(false);

    translateY.value = withTiming(
      -BANNER_HEIGHT - 20,
      { duration: 300, easing: Easing.in(Easing.cubic) },
      () => onDone?.(),
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Button handlers                                                   */
  /* ------------------------------------------------------------------ */
  const togglePlayPause = () => {
    status?.playing ? player.pause() : player.play();
  };
  const stop = () => player.pause();

  /* ------------------------------------------------------------------ */
  /*  Animated styles                                                   */
  /* ------------------------------------------------------------------ */
  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  const waveStyle1 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave1.value }] }));
  const waveStyle2 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave2.value }] }));
  const waveStyle3 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave3.value }] }));

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <Animated.View style={[styles.banner, bannerStyle]}>
      {/* progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <View style={styles.row}>
        {/* text + waveform */}
        <View style={styles.textWrap}>
          <Text style={styles.text} numberOfLines={2}>
            {text}
          </Text>

          <View style={styles.waveRow}>
            <Animated.View style={[styles.wave, waveStyle1]} />
            <Animated.View style={[styles.wave, waveStyle2]} />
            <Animated.View style={[styles.wave, waveStyle3]} />
            <Animated.View style={[styles.wave, waveStyle2]} />
            <Animated.View style={[styles.wave, waveStyle1]} />
          </View>
        </View>

        {/* controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
            <Text style={styles.playIcon}>{status?.playing ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={stop} style={styles.stopBtn}>
            <Text style={styles.stopIcon}>⏹</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

/* -------------------------------------------------------------------- */
/*  Styles                                                              */
/* -------------------------------------------------------------------- */
const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    height: BANNER_HEIGHT,
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10A37F',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  textWrap: { flex: 1, marginRight: 12 },
  text: { color: '#FFF', fontSize: 14, marginBottom: 4 },
  waveRow: { flexDirection: 'row', alignItems: 'center', height: 16, gap: 2 },
  wave: { width: 3, height: 8, backgroundColor: '#10A37F', borderRadius: 1.5 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playBtn: { backgroundColor: '#10A37F', padding: 6, borderRadius: 16, minWidth: 32, alignItems: 'center' },
  playIcon: { fontSize: 14, color: '#FFF' },
  stopBtn: { padding: 4 },
  stopIcon: { fontSize: 16, color: '#FF6B6B' },
});

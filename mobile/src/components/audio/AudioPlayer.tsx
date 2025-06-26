import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import { Colors } from '@/src/constants/Colors';

// WaveBar component (✅ Fixed)
const WaveBar = ({
  animationHeight,
  isActive,
  isPlaying,
  index,
  totalBars,
}: {
  animationHeight: Animated.SharedValue<number>;
  isActive: boolean;
  isPlaying: boolean;
  index: number;
  totalBars: number;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: `${Math.max(animationHeight.value, 0.1) * 100}%`,
      opacity: withTiming(isPlaying ? 1 : 0.6, { duration: 200 }),
      transform: [
        {
          scaleY: withSpring(isPlaying ? 1 : 0.8, {
            damping: 8,
            stiffness: 120,
          }),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.waveBar,
        animatedStyle,
        {
          backgroundColor: isActive
            ? Colors.dark.bgPrimary || Colors.dark.txtPrimary
            : Colors.dark.borderColor,
        },
      ]}
    />
  );
};

const AudioPlayer = ({
  audioUrl,
  audioDuration,
  audioName,
}: {
  audioUrl: string;
  audioDuration?: number;
  audioName?: string;
}) => {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [actualDuration, setActualDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioSource: AudioSource = useMemo(() => {
    if (!audioUrl || typeof audioUrl !== 'string') {
      console.warn('Invalid audio URL:', audioUrl);
      return { uri: '' };
    }
    return { uri: audioUrl };
  }, [audioUrl]);

  const player = useAudioPlayer(audioSource);
  const BAR_COUNT = 20;

  // Create an array of shared values (must not use hooks inside useMemo)
  const waveAnimations: Animated.SharedValue<number>[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    waveAnimations.push(useSharedValue(Math.random() * 0.3 + 0.2));
  }

  const loadingRotation = useSharedValue(0);
  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${loadingRotation.value}deg` }],
  }));

  const waveformPattern = useMemo(() => {
    const basePattern = [
      0.8, 0.4, 0.9, 0.3, 0.7, 0.5, 0.95, 0.2, 0.6, 0.8,
      0.4, 0.85, 0.3, 0.9, 0.5, 0.7, 0.25, 0.8, 0.6, 0.4,
    ];
    return basePattern.slice(0, BAR_COUNT);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        if (player && player.play) await player.play();
        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Init error:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };
    initialize();
  }, [audioUrl]);

  useEffect(() => {
    const timeouts: any[] = [];
    const intervals: any[] = [];

    if (isPlaying) {
      waveAnimations.forEach((anim, i) => {
        const animate = () => {
          const base = waveformPattern[i];
          const random = Math.random() * 0.3 + 0.8;
          anim.value = withSpring(Math.min(base * random, 0.95), {
            damping: 5 + Math.random() * 4,
            stiffness: 80 + Math.random() * 30,
          });
        };

        const timeout = setTimeout(() => {
          animate();
          const interval = setInterval(animate, 150 + Math.random() * 200);
          intervals.push(interval);
        }, i * 30);

        timeouts.push(timeout);
      });
    } else {
      waveAnimations.forEach((anim, i) => {
        const timeout = setTimeout(() => {
          anim.value = withSpring(waveformPattern[i] * 0.4);
        }, i * 20);
        timeouts.push(timeout);
      });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (isLoading) {
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1
      );
    } else {
      loadingRotation.value = withTiming(0, { duration: 200 });
    }
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (player && player.remove) player.remove();
    };
  }, []);

  const playPauseAudio = useCallback(async () => {
    if (!isInitialized || isLoading) return;

    try {
      setIsLoading(true);
      if (isPlaying && player.pause) await player.pause();
      else if (player.play) await player.play();
      setIsPlaying(!isPlaying);
    } catch (e) {
      setHasError(true);
      Alert.alert('Error', 'Could not play audio');
    } finally {
      setIsLoading(false);
    }
  }, [player, isPlaying, isInitialized, isLoading]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = actualDuration || audioDuration || 0;
  const progress = duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity
        onPress={playPauseAudio}
        style={[
          styles.audioPlayButton,
          hasError && styles.audioPlayButtonError,
          isLoading && styles.audioPlayButtonLoading,
        ]}
        disabled={isLoading || !isInitialized}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <Animated.View style={loadingAnimatedStyle}>
            <Feather name="loader" size={18} color="#fff" />
          </Animated.View>
        ) : hasError ? (
          <Feather name="alert-circle" size={18} color="#fff" />
        ) : (
          <Feather
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color="#fff"
            style={!isPlaying && { marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>

      <View style={styles.audioInfo}>
        <Text style={styles.audioName} numberOfLines={1}>
          {audioName || 'Audio message'}
        </Text>
        <View style={styles.waveformContainer}>
          {waveAnimations.map((anim, i) => (
            <WaveBar
              key={i}
              animationHeight={anim}
              isActive={progress > i / BAR_COUNT}
              isPlaying={isPlaying}
              index={i}
              totalBars={BAR_COUNT}
            />
          ))}
        </View>
        <View style={styles.audioFooter}>
          <Text style={styles.audioDuration}>
            {formatTime(currentPosition)} / {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  audioPlayButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  audioPlayButtonError: {
    backgroundColor: '#ff6b6b',
  },
  audioPlayButtonLoading: {
    opacity: 0.7,
  },
  audioInfo: {
    flex: 1,
    gap: 8,
  },
  audioName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
    paddingHorizontal: 2,
    gap: 1.5,
  },
  waveBar: {
    flex: 1,
    maxWidth: 3,
    minHeight: 4,
    borderRadius: 1.5,
    backgroundColor: '#888',
  },
  audioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioDuration: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
});

export { AudioPlayer };

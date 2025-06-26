import { Audio } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

export const useAudioPlayer = (url: string) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [status, setStatus] = useState<Audio.AVPlaybackStatus | null>(null);

  const loadAndPlay = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );
    soundRef.current = sound;
  };

  const onPlaybackStatusUpdate = (s: Audio.AVPlaybackStatus) => {
    setStatus(s);
  };

  const play = async () => {
    if (soundRef.current) await soundRef.current.playAsync();
  };

  const pause = async () => {
    if (soundRef.current) await soundRef.current.pauseAsync();
  };

  const stop = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    }
  };

  useEffect(() => {
    return () => {
      stop(); // Cleanup
    };
  }, []);

  return {
    status,
    play,
    pause,
    stop,
    loadAndPlay,
  };
};

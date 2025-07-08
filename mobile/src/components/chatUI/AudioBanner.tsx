import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors } from '@/src/constants/Colors';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

interface SpeechBannerProps {
  message: string;
  visible: boolean;
  autoDismiss?: boolean;
  onClose: () => void;
  isGenerating?: boolean;
  isSpeaking?: boolean;
  onStop?: () => void;
}

const AudioBanner: React.FC<SpeechBannerProps> = ({
  message,
  visible,
  autoDismiss = true,
  onClose,
  isGenerating = false,
  isSpeaking = false,
  onStop,
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Slide animation effect
  useEffect(() => {
    if (visible) {
      // Slide down
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Pulse animation for generating state
  useEffect(() => {
    if (isGenerating) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      
      return () => {
        pulseAnimation.stop();
        pulseAnim.setValue(1);
      };
    } else {
      pulseAnim.setValue(1);
    }
  }, [isGenerating, pulseAnim]);

  // Auto dismiss functionality
  useEffect(() => {
    if (autoDismiss && !isSpeaking && !isGenerating && visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto dismiss after 3 seconds when not speaking

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, isSpeaking, isGenerating, visible, onClose]);

  const handleStopSpeech = () => {
    if (onStop && isSpeaking) {
      onStop();
    }
  };

  const getStatusText = () => {
    if (isGenerating) return 'Preparing audio...';
    if (isSpeaking) return 'Speaking...';
    return 'Ready';
  };

  const getStatusIcon = () => {
    if (isGenerating) return 'hourglass-half';
    if (isSpeaking) return 'volume-high';
    return 'check-circle';
  };

  const getStatusColor = () => {
    if (isGenerating) return  '#FFA500';
    if (isSpeaking) return  '#28A745';
    return Colors.dark.txtSecondary;
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <Animated.View
            style={[
              styles.statusIconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <FontAwesome6
              name={getStatusIcon()}
              size={16}
              color={getStatusColor()}
            />
          </Animated.View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <Text style={styles.messageText} numberOfLines={2}>
              {message}
            </Text>
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          {/* Stop Button - Only show when speaking */}
          {isSpeaking && onStop && (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStopSpeech}
            >
              <FontAwesome6 name="stop" size={14} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.closeButton]}
            onPress={onClose}
          >
            <FontAwesome6 name="xmark" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar for Speaking State */}
      {isSpeaking && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  transform: [{ scaleX: pulseAnim }],
                },
              ]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressBarContainer: {
    height: 4,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  progressFill: {
    backgroundColor: '#27AE60',
    height: '100%',
    width: '100%',
    borderRadius: 2,
    transform: [{ scaleX: 1 }],
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  volumeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  volumeButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  audioBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2C3E50',
    zIndex: 999,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bannerContent: {
    padding: 20,
    paddingTop: 60, // Account for status bar
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  controlButton: {
    backgroundColor: '#34495E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'center',
  },
  mutedButton: {
    backgroundColor: '#E74C3C',
  },
  playButton: {
    backgroundColor: '#27AE60',
  },
  disabledButton: {
    backgroundColor: '#7F8C8D',
    opacity: 0.6,
  },
  controlButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    color: '#BDC3C7',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#95A5A6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'center',
  },
  stopButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100, // Space for the volume button
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
  },
  messageText: {
    color: '#2C3E50',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 2,
  },
  statusTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
  },
  statusSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

export default AudioBanner;
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  Vibration,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

type AlertType = 'success' | 'error' | 'warning' | 'info';

type CustomAlertProps = {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
};

const CustomAlert = ({
  visible,
  type,
  title,
  message,
  primaryButtonText = 'OK',
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  onClose,
  showCloseButton = true,
  autoClose = false,
  autoCloseDelay = 3000,
}: CustomAlertProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const handleClose = () => {
    onClose?.();
  };

  useEffect(() => {
    if (visible) {
      // Reset animations to initial values
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Haptic feedback
      if (type === 'success') {
        Vibration.vibrate([0, 100]); // Short vibration for success
      } else if (type === 'error') {
        Vibration.vibrate([0, 200, 100, 200]); // Pattern for error
      }

      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, type, autoClose, fadeAnim, handleClose, scaleAnim, slideAnim, autoCloseDelay]);

  const handlePrimaryPress = () => {
    onPrimaryPress?.();
    if (onPrimaryPress) {
      handleClose();
    }
  };

  const handleSecondaryPress = () => {
    onSecondaryPress?.();
    if (onSecondaryPress) {
      handleClose();
    }
  };

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          iconName: 'checkmark-circle',
          iconFamily: 'Ionicons' as const,
          iconColor: '#00C853',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#00C853',
        };
      case 'error':
        return {
          iconName: 'close-circle',
          iconFamily: 'Ionicons' as const,
          iconColor: '#FF3B30',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#FF3B30',
        };
      case 'warning':
        return {
          iconName: 'warning',
          iconFamily: 'Ionicons' as const,
          iconColor: '#FF9500',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#FF950015',
        };
      case 'info':
        return {
          iconName: 'information-circle',
          iconFamily: 'Ionicons' as const,
          iconColor: Colors.dark.button,
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: Colors.dark.button,
        };
      default:
        return {
          iconName: 'information-circle',
          iconFamily: 'Ionicons' as const,
          iconColor: '#007AFF',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#007AFF',
        };
    }
  };

  const config = getAlertConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.6)" barStyle="light-content" />
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
        
        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: config.backgroundColor,
              borderColor: config.borderColor,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* Close Button */}
          {showCloseButton && (
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={20} color={Colors.dark.txtSecondary} />
            </Pressable>
          )}

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${config.iconColor}15` },
              ]}
            >
              <Ionicons name={config.iconName as any} size={40} color={config.iconColor} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {secondaryButtonText && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={handleSecondaryPress}
              >
                <Text style={styles.secondaryButtonText}>
                  {secondaryButtonText}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: config.primaryButtonColor },
                pressed && styles.primaryButtonPressed,
                secondaryButtonText ? { flex: 1 } : { width: '100%' },
              ]}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Types for the alert state
type AlertState = {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  showCloseButton: boolean;
  autoClose: boolean;
  autoCloseDelay: number;
};

// Enhanced hook with conflict resolution
export const useCustomAlert = () => {
  const [alertState, setAlertState] = React.useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    primaryButtonText: 'OK',
    secondaryButtonText: undefined,
    onPrimaryPress: undefined,
    onSecondaryPress: undefined,
    showCloseButton: true,
    autoClose: false,
    autoCloseDelay: 3000,
  });

  // Queue to handle multiple alerts
  const alertQueue = useRef<AlertState[]>([]);
  const isProcessing = useRef(false);

  const processQueue = React.useCallback(() => {
    if (alertQueue.current.length > 0 && !isProcessing.current) {
      isProcessing.current = true;
      const nextAlert = alertQueue.current.shift()!;
      setAlertState(nextAlert);
    }
  }, []);

  const showAlert = React.useCallback((config: {
    type: AlertType;
    title: string;
    message: string;
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
    showCloseButton?: boolean;
    autoClose?: boolean;
    autoCloseDelay?: number;
  }) => {
    const newAlert: AlertState = {
      visible: true,
      primaryButtonText: 'OK',
      showCloseButton: true,
      autoClose: false,
      autoCloseDelay: 3000,
      ...config,
    };

    // If an alert is currently visible, queue the new one
    if (alertState.visible) {
      alertQueue.current.push(newAlert);
    } else {
      setAlertState(newAlert);
      isProcessing.current = true;
    }
  }, [alertState.visible]);

  const hideAlert = React.useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
    
    // Process next alert in queue after a short delay
    setTimeout(() => {
      isProcessing.current = false;
      processQueue();
    }, 300);
  }, [processQueue]);

  const showSuccess = React.useCallback((title: string, message: string, options?: {
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
    showCloseButton?: boolean;
    autoClose?: boolean;
    autoCloseDelay?: number;
  }) => {
    showAlert({
      type: 'success',
      title,
      message,
      autoClose: true,
      autoCloseDelay: 2500,
      ...options,
    });
  }, [showAlert]);

  const showError = React.useCallback((title: string, message: string, options?: {
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
    showCloseButton?: boolean;
    autoClose?: boolean;
    autoCloseDelay?: number;
  }) => {
    showAlert({
      type: 'error',
      title,
      message,
      ...options,
    });
  }, [showAlert]);

  const showWarning = React.useCallback((title: string, message: string, options?: {
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
    showCloseButton?: boolean;
    autoClose?: boolean;
    autoCloseDelay?: number;
  }) => {
    showAlert({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }, [showAlert]);

  const showInfo = React.useCallback((title: string, message: string, options?: {
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
    showCloseButton?: boolean;
    autoClose?: boolean;
    autoCloseDelay?: number;
  }) => {
    showAlert({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [showAlert]);

  // Clear queue function for emergency cases
  const clearAlertQueue = React.useCallback(() => {
    alertQueue.current = [];
    isProcessing.current = false;
  }, []);

  const AlertComponent = () => (
    <CustomAlert
      {...alertState}
      onClose={hideAlert}
    />
  );

  return {
    AlertComponent,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAlertQueue,
  };
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.txtPrimary,
    textAlign: 'center',
    marginBottom: 8,
    width: '100%', 
  },
  message: {
    fontSize: 16,
    color: Colors.dark.txtSecondary,
    textAlign: 'center',
    lineHeight: 22,
    width: '100%', 
    paddingHorizontal: 4, 
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ scale: 0.98 }],
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
  },
});

export default CustomAlert;
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
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
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
    if (!onPrimaryPress) {
      handleClose();
    }
  };

  const handleSecondaryPress = () => {
    onSecondaryPress?.();
    if (!onSecondaryPress) {
      handleClose();
    }
  };

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: '#00C853',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#00C853',
        };
      case 'error':
        return {
          icon: XCircle,
          iconColor: '#FF3B30',
          backgroundColor:Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#FF3B30',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: '#FF9500',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#FF9500',
        };
      case 'info':
        return {
          icon: Info,
          iconColor: '#007AFF',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#007AFF',
        };
      default:
        return {
          icon: Info,
          iconColor: '#007AFF',
          backgroundColor: Colors.dark.bgPrimary,
          borderColor: Colors.dark.borderColor,
          primaryButtonColor: '#007AFF',
        };
    }
  };

  const config = getAlertConfig();
  const IconComponent = config.icon;

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
              <X size={20} color={Colors.dark.txtSecondary} />
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
              <IconComponent size={40} color={config.iconColor} />
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

// Hook for easier usage
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

  const showAlert = (config: {
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
    setAlertState({
      visible: true,
      primaryButtonText: 'OK',
      showCloseButton: true,
      autoClose: false,
      autoCloseDelay: 3000,
      ...config,
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const showSuccess = (title: string, message: string, options?: {
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
  };

  const showError = (title: string, message: string, options?: {
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
  };

  const showWarning = (title: string, message: string, options?: {
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
  };

  const showInfo = (title: string, message: string, options?: {
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
  };

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
    backgroundColor: Colors.dark.bgSecondary,
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
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.txtPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: Colors.dark.txtSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
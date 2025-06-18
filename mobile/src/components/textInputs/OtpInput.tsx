import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Animated,
  Text,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Colors } from '@/src/constants/Colors';

interface OTPInputProps {
  codeLength?: number;
  onCodeFilled?: (code: string) => void;
  onResendCode?: () => void;
  resendDelay?: number; // in seconds
  isLoading?: boolean;
  onSubmit?: (code: string) => void;
  submitButtonText?: string;
}

// Helper for formatting time
function formatTimeHelper(time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Hook for managing OTP code state and input focus
function useOtpCode(codeLength: number) {
  const [code, setCode] = useState<string[]>(Array(codeLength).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(TextInput | null)[]>(Array(codeLength).fill(null));
  const animations = useRef<Animated.Value[]>(
    Array(codeLength).fill(0).map(() => new Animated.Value(1))
  );

  const animateFocus = useCallback((index: number, focused: boolean) => {
    setFocusedIndex(focused ? index : -1);
    Animated.timing(animations.current[index], {
      toValue: focused ? 1.05 : 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return { code, setCode, focusedIndex, setFocusedIndex, inputRefs, animations, animateFocus };
}

// Hook for managing resend timer
function useResendTimer(resendDelay: number) {
  const [timeLeft, setTimeLeft] = useState<number>(resendDelay);
  const [canResend, setCanResend] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCanResend(false);
    setTimeLeft(resendDelay);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setCanResend(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [resendDelay]);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startCountdown]);

  return { timeLeft, canResend, startCountdown };
}

// Main custom hook for OTP logic
function useOtpInput({
  codeLength,
  onCodeFilled,
  onResendCode,
  resendDelay,
  onSubmit,
}: Required<Pick<OTPInputProps, 'codeLength' | 'resendDelay'>> & 
  Pick<OTPInputProps, 'onCodeFilled' | 'onResendCode' | 'onSubmit'>) {
  const {
    code,
    setCode,
    focusedIndex,
    setFocusedIndex,
    inputRefs,
    animations,
    animateFocus,
  } = useOtpCode(codeLength);

  const { timeLeft, canResend, startCountdown } = useResendTimer(resendDelay);

  useEffect(() => {
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }
    }, 100);

    // Remove keyboard listeners on unmount
    return () => {
      Keyboard.removeAllListeners('keyboardDidShow');
      Keyboard.removeAllListeners('keyboardDidHide');
    };
  }, [inputRefs]);

  const hasTriggered = useRef(false);

  useEffect(() => {
    const completeCode = code.join('');
    if (completeCode.length === codeLength && !hasTriggered.current && onCodeFilled) {
      hasTriggered.current = true;
      onCodeFilled(completeCode);
    } else if (completeCode.length < codeLength) {
      hasTriggered.current = false;
    }
  }, [code, codeLength, onCodeFilled]);

  const handleSubmit = useCallback(() => {
    const completeCode = code.join('');
    if (completeCode.length === codeLength && onSubmit) {
      onSubmit(completeCode);
    }
  }, [code, codeLength, onSubmit]);

  const handleResendCode = useCallback(() => {
    if (canResend && onResendCode) {
      onResendCode();
      startCountdown();
      setCode(Array(codeLength).fill(''));
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0]?.focus();
        }
      }, 100);
    }
  }, [canResend, onResendCode, codeLength, startCountdown, setCode, inputRefs]);

  const handleChange = useCallback((text: string, index: number): void => {
    if (text === '' && code[index] === '') {
      if (index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 10);
      }
      return;
    }

    if (text === '' || /^\d$/.test(text)) {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      if (text !== '' && index < codeLength - 1) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 10);
      }
    }
  }, [code, codeLength, setCode, inputRefs]);

  const handleKeyPress = useCallback((event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number): void => {
    if (event.nativeEvent.key === 'Backspace') {
      if (code[index] !== '') {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 10);
      }
    }
  }, [code, setCode, inputRefs]);

  const isCodeComplete = code.join('').length === codeLength;

  return {
    code,
    focusedIndex,
    timeLeft,
    canResend,
    inputRefs,
    animations,
    formatTime: formatTimeHelper,
    handleChange,
    handleKeyPress,
    animateFocus,
    handleResendCode,
    handleSubmit,
    isCodeComplete,
  };
}

// Subcomponent for OTP input fields
const OtpFields: React.FC<{
  code: string[];
  focusedIndex: number;
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  animations: React.MutableRefObject<Animated.Value[]>;
  handleChange: (text: string, index: number) => void;
  handleKeyPress: (event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => void;
  animateFocus: (index: number, focused: boolean) => void;
  isLoading?: boolean;
}> = ({
  code,
  focusedIndex,
  inputRefs,
  animations,
  handleChange,
  handleKeyPress,
  animateFocus,
  isLoading = false,
}) => (
    <View style={styles.inputContainer}>
      {code.map((digit, index) => (
        <Animated.View
          key={index}
          style={[
            styles.inputWrapper,
            { transform: [{ scale: animations.current[index] }] }
          ]}
        >
          <TextInput
            ref={ref => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.input,
              focusedIndex === index && styles.inputFocused,
              isLoading && styles.inputDisabled
            ]}
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={e => handleKeyPress(e, index)}
            onFocus={() => animateFocus(index, true)}
            onBlur={() => animateFocus(index, false)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            placeholder="•"
            placeholderTextColor={Colors.dark.txtSecondary}
            selectionColor={Colors.dark.link}
            caretHidden={true}
            autoComplete="off"
            autoCorrect={false}
            editable={!isLoading}
          />
        </Animated.View>
      ))}
    </View>
  );

// Subcomponent for submit button
const OtpSubmitButton: React.FC<{
  isCodeComplete: boolean;
  isLoading?: boolean;
  onSubmit: () => void;
  submitButtonText?: string;
}> = ({
  isCodeComplete,
  isLoading = false,
  onSubmit,
  submitButtonText = "Verify OTP",
}) => (
    <TouchableOpacity
      style={[
        styles.submitButton,
        !isCodeComplete && styles.submitButtonDisabled,
        isLoading && styles.submitButtonLoading
      ]}
      onPress={onSubmit}
      disabled={!isCodeComplete || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={Colors.dark.txtPrimary} 
            style={styles.loadingIndicator}
          />
          <Text style={[styles.submitButtonText, styles.loadingText]}>
            Verifying...
          </Text>
        </View>
      ) : (
        <Text style={[
          styles.submitButtonText,
          !isCodeComplete && styles.submitButtonTextDisabled
        ]}>
          {submitButtonText}
        </Text>
      )}
    </TouchableOpacity>
  );

// Subcomponent for resend/counter
const OtpResend: React.FC<{
  canResend: boolean;
  handleResendCode: () => void;
  timeLeft: number;
  formatTime: (time: number) => string;
  isLoading?: boolean;
}> = ({
  canResend,
  handleResendCode,
  timeLeft,
  formatTime,
  isLoading = false,
}) => (
    <View style={styles.resendContainer}>
      {canResend ? (
        <TouchableOpacity
          style={[styles.resendButton, isLoading && styles.resendButtonDisabled]}
          onPress={handleResendCode}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Text style={[
            styles.resendText, 
            { color: Colors.dark.txtPrimary },
            isLoading && styles.resendTextDisabled
          ]}>
            Didn&apos;t receive code? <Text style={[styles.resendText, isLoading && styles.resendTextDisabled]}>Resend</Text>
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>
            Resend code in <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
          </Text>
        </View>
      )}
    </View>
  );

const OTPInput: React.FC<OTPInputProps> = ({
  codeLength = 6,
  onCodeFilled,
  onResendCode,
  resendDelay = 600,
  isLoading = false,
  onSubmit,
  submitButtonText = "Verify OTP",
}) => {
  const otp = useOtpInput({
    codeLength,
    onCodeFilled,
    onResendCode,
    resendDelay,
    onSubmit,
  });

  return (
    <View style={styles.container}>
      <OtpFields
        code={otp.code}
        focusedIndex={otp.focusedIndex}
        inputRefs={otp.inputRefs}
        animations={otp.animations}
        handleChange={otp.handleChange}
        handleKeyPress={otp.handleKeyPress}
        animateFocus={otp.animateFocus}
        isLoading={isLoading}
      />
      
      <OtpSubmitButton
        isCodeComplete={otp.isCodeComplete}
        isLoading={isLoading}
        onSubmit={otp.handleSubmit}
        submitButtonText={submitButtonText}
      />
      
      <OtpResend
        canResend={otp.canResend}
        handleResendCode={otp.handleResendCode}
        timeLeft={otp.timeLeft}
        formatTime={otp.formatTime}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  inputWrapper: {
    marginHorizontal: 4,
  },
  input: {
    width: 50,
    height: 50,
    textAlign: 'center',
    borderRadius: 8,
    color: Colors.dark.txtPrimary,
    fontSize: 24,
    backgroundColor: Colors.dark.bgSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: Colors.dark.link,
    shadowColor: Colors.dark.link,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  submitButton: {
    backgroundColor: Colors.dark.link,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.dark.link,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.dark.bgSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonLoading: {
    backgroundColor: Colors.dark.link,
    opacity: 0.8,
  },
  submitButtonText: {
    color: Colors.dark.txtPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope-medium',
  },
  submitButtonTextDisabled: {
    color: Colors.dark.txtSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  loadingText: {
    color: Colors.dark.txtPrimary,
  },
  resendContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  resendButton: {
    padding: 8,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: Colors.dark.link,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope-medium'
  },
  resendTextDisabled: {
    color: Colors.dark.txtSecondary,
  },
  countdownContainer: {
    padding: 8,
  },
  countdownText: {
    color: Colors.dark.txtSecondary,
    fontSize: 14,
  },
  timeText: {
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
  },
});

export default OTPInput;
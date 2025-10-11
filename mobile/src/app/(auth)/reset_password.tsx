import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';
import Logo from '@/src/components/logo/Logo';
import authApi from '@/src/services/authApiClient';
import { getPasswordResetErrorDetails } from '@/src/utils/errorHandler';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('screen');

interface PasswordState {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const params = useLocalSearchParams();
  const { userId, email } = params; // Passed from OTP verification screen

  const [passwords, setPasswords] = useState<PasswordState>({
    password: '',
    confirmPassword: '',
  });
  const [isDisabled, setIsDisabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [passwordStrength, setPasswordStrength] = useState<string>('');

  const { AlertComponent, showSuccess, showError } = useCustomAlert();

  // Validate passwords
  useEffect(() => {
    const isFilled =
      passwords.password.trim() !== '' &&
      passwords.confirmPassword.trim() !== '';
    const isMatching = passwords.password === passwords.confirmPassword;
    const isLongEnough = passwords.password.length >= 8;

    setIsDisabled(!(isFilled && isMatching && isLongEnough));
  }, [passwords]);

  // Check password strength
  useEffect(() => {
    const password = passwords.password;
    if (password.length === 0) {
      setPasswordStrength('');
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength('Weak');
    else if (strength <= 3) setPasswordStrength('Medium');
    else setPasswordStrength('Strong');
  }, [passwords.password]);

  const handleTextInputChange = (name: string, value: string) => {
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'Weak':
        return '#EF4444';
      case 'Medium':
        return '#F59E0B';
      case 'Strong':
        return '#10B981';
      default:
        return Colors.dark.txtSecondary;
    }
  };

  const handleSubmit = async () => {
    // Frontend validation
    if (passwords.password.length < 8) {
      showError(
        'Password Too Short',
        'Password must be at least 8 characters long for security',
        {
          primaryButtonText: 'Okay',
        }
      );
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      showError(
        'Passwords Don\'t Match',
        'Please make sure both passwords are the same',
        {
          primaryButtonText: 'Try Again',
        }
      );
      return;
    }

    if (passwordStrength === 'Weak') {
      showError(
        'Weak Password',
        'Please use a stronger password with uppercase, lowercase, numbers, and special characters',
        {
          primaryButtonText: 'Okay',
        }
      );
      return;
    }

    setIsLoading(true);

    try {
      // Call your backend to reset password
      // Note: You'll need to add this endpoint to your backend
      const response = await authApi.post('/api/auth/reset-password', {
        userId,
        newPassword: passwords.password,
      });

      console.log('Password reset success:', response.data);

      if (response.data.success) {
        showSuccess(
          'Password Reset Successful',
          response.data.message || 'Your password has been reset successfully. You can now log in with your new password.',
          {
            autoClose: false,
            primaryButtonText: 'Go to Login',
            onPrimaryPress: () => {
              router.replace('/(auth)/login');
            },
          }
        );

        // Auto-navigate after delay
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);

      const errorData = error.response?.data;
      let errorCode = 'UNKNOWN_ERROR';
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (errorData?.error) {
        errorCode = errorData.error.code || errorCode;
        errorMessage = errorData.error.message || errorMessage;
      }

      const errorDetails = getPasswordResetErrorDetails(errorCode, errorMessage, {
        onRetry: () => handleSubmit(),
      });

      showError(errorDetails.title, errorDetails.message, {
        primaryButtonText: errorDetails.actionText,
        onPrimaryPress: errorDetails.action,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Animated.View style={styles.innerContainer}>
        <Logo />

        <Animated.View style={styles.headerContainer}>
          <Animated.Text
            style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
            entering={FadeInUp.duration(600).springify()}
          >
            Reset Your Password
          </Animated.Text>
          <Animated.Text
            style={styles.subtitle}
            entering={FadeInUp.duration(600).delay(100).springify()}
          >
            Create a new password for your account. Make sure it&apos;s strong and
            easy for you to remember.
          </Animated.Text>
        </Animated.View>

        {/* Password Input */}
        <AnimatedTextInput
          label="New Password"
          value={passwords.password}
          onChangeText={(text) => handleTextInputChange('password', text)}
          secureTextEntry
          placeholder="Enter a strong password"
         
        />

        {/* Password Strength Indicator */}
        {passwords.password.length > 0 && (
          <Animated.View
            style={styles.strengthContainer}
            entering={FadeInUp.duration(300)}
          >
            <View style={styles.strengthBarContainer}>
              <View
                style={[
                  styles.strengthBar,
                  {
                    width:
                      passwordStrength === 'Weak'
                        ? '33%'
                        : passwordStrength === 'Medium'
                        ? '66%'
                        : '100%',
                    backgroundColor: getPasswordStrengthColor(),
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.strengthText,
                { color: getPasswordStrengthColor() },
              ]}
            >
              {passwordStrength}
            </Text>
          </Animated.View>
        )}

        {/* Confirm Password Input */}
        <AnimatedTextInput
          label="Confirm New Password"
          value={passwords.confirmPassword}
          onChangeText={(text) =>
            handleTextInputChange('confirmPassword', text)
          }
          secureTextEntry
          placeholder="Enter same password"
        
        />

        {/* Password Match Indicator */}
        {passwords.confirmPassword.length > 0 && (
          <Animated.View
            style={styles.matchContainer}
            entering={FadeInUp.duration(300)}
          >
            {passwords.password === passwords.confirmPassword ? (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.matchText, { color: '#10B981' }]}>
                  Passwords match
                </Text>
              </View>
            ) : (
              <View style={styles.matchRow}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={[styles.matchText, { color: '#EF4444' }]}>
                  Passwords don&apos;t match
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Submit Button */}
        <Button
          title="Reset Password"
          disabled={isDisabled || isLoading}
          loading={isLoading}
          onPress={handleSubmit}
        />

        {/* Password Requirements */}
        <Animated.View
          style={styles.requirementsContainer}
          entering={FadeInUp.duration(600).delay(200).springify()}
        >
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <View style={styles.requirementRow}>
            <Ionicons
              name={passwords.password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={passwords.password.length >= 8 ? '#10B981' : Colors.dark.txtSecondary}
            />
            <Text style={styles.requirementText}>At least 8 characters</Text>
          </View>
          <View style={styles.requirementRow}>
            <Ionicons
              name={
                /[A-Z]/.test(passwords.password) && /[a-z]/.test(passwords.password)
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={16}
              color={
                /[A-Z]/.test(passwords.password) && /[a-z]/.test(passwords.password)
                  ? '#10B981'
                  : Colors.dark.txtSecondary
              }
            />
            <Text style={styles.requirementText}>
              Uppercase and lowercase letters
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Ionicons
              name={/\d/.test(passwords.password) ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={/\d/.test(passwords.password) ? '#10B981' : Colors.dark.txtSecondary}
            />
            <Text style={styles.requirementText}>At least one number</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <AlertComponent />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 60,
    width: width > 768 ? width / 2 : width,
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 30,
  },
  textHeader: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.txtSecondary,
    textAlign: 'center',
    fontFamily: 'Manrope-Medium',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  strengthContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: Colors.dark.borderColor,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
    transitionDelay: 'all 0.3s ease',
  },
  strengthText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    textAlign: 'right',
  },
  matchContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
  },
  requirementsContainer: {
    width: '100%',
    marginTop: 20,
    padding: 15,
    backgroundColor: Colors.dark.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
  },
  requirementsTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.dark.txtPrimary,
    marginBottom: 10,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: Colors.dark.txtSecondary,
  },
});

export default ResetPassword;
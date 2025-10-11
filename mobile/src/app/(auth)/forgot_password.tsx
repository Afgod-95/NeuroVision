import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { emailRegex } from '@/src/constants/Regex';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';
import Logo from '@/src/components/logo/Logo';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('screen');

const ForgotPassword = () => {
  const [email, setEmail] = useState<string>('');
  const [isDisabled, setIsDisabled] = useState<boolean>(true);

  const { AlertComponent, showSuccess, showError } = useCustomAlert();

  // Initialize mutation
  const mutation = useAuthMutation();
  const forgotPasswordMutation = mutation.useForgotPasswordMutation();

  // Validate email on change
  React.useEffect(() => {
    const isValid = email.trim() !== '' && emailRegex.test(email);
    setIsDisabled(!isValid);
  }, [email]);

  const handleSubmit = async () => {
    // Frontend validation
    if (!emailRegex.test(email)) {
      showError(
        'Invalid Email',
        'Please enter a valid email address',
        {
          primaryButtonText: 'Got it',
        }
      );
      return;
    }

    try {
      const data = await forgotPasswordMutation.mutateAsync({
        email: email.trim().toLowerCase(),
      });

      console.log('Forgot password success:', data);

      if (data.success) {
        showSuccess(
          'Reset Link Sent',
          data.message || 'Password reset instructions have been sent to your email',
          {
            autoClose: false,
            primaryButtonText: 'Enter Code',
            onPrimaryPress: () => {
              // Navigate to OTP verification for password reset
              router.push({
                pathname: '/(auth)/verify/[userId]',
                params: {
                    userId: data.userId,
                    email: email.trim().toLowerCase(),
                    type: "Password_reset"
                },
              });
            },
          }
        );
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
    }
  };

  return (
    <ScreenWrapper>
      <Animated.View style={styles.innerContainer}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={Colors.dark.txtPrimary}
          />
        </TouchableOpacity>

        <Logo />

        <Animated.View style={styles.headerContainer}>
          <Animated.Text
            style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
            entering={FadeInUp.duration(600).springify()}
          >
            Forgot Password?
          </Animated.Text>
          <Animated.Text
            style={styles.subtitle}
            entering={FadeInUp.duration(600).delay(100).springify()}
          >
            No worries! Enter your email address and we&apos;ll send you a code to
            reset your password.
          </Animated.Text>
        </Animated.View>

        <AnimatedTextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="johndoe@gmail.com"
        />

        <Button
          title="Send Reset Code"
          disabled={isDisabled || forgotPasswordMutation.isPending}
          loading={forgotPasswordMutation.isPending}
          onPress={handleSubmit}
        />

        <Animated.View
          style={styles.backToLoginContainer}
          entering={FadeInUp.duration(600).delay(200).springify()}
        >
          <Text style={styles.backToLoginText}>Remember your password?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.backToLoginText, { color: Colors.dark.link }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
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
  backToLoginContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    marginTop: 25,
  },
  backToLoginText: {
    color: Colors.dark.txtSecondary,
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
  },
});

export default ForgotPassword;
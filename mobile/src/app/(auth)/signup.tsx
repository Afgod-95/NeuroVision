import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import ContinueWithGoogle from '@/src/components/button/ContinueWithGoogle';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { emailRegex, usernameRegex } from '@/src/constants/Regex';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';
import Logo from '@/src/components/logo/Logo';

const { width } = Dimensions.get('screen');

interface UserProps {
  username: string;
  email: string;
  password: string;
}

const SignUp = () => {
  const [user, setUser] = useState<UserProps>({
    username: '',
    email: '',
    password: '',
  });

  const [isDisabled, setIsDisabled] = useState<boolean>(true);

  const { AlertComponent, showSuccess, showError } = useCustomAlert();

  useEffect(() => {
    const isFilled =
      user.username.trim() !== '' &&
      user.email.trim() !== '' &&
      user.password.trim() !== '';
    setIsDisabled(!isFilled);
  }, [user]);

  const handleTextInputChange = (name: string, value: string) => {
    setUser({ ...user, [name]: value });
  };

  // Initialize mutation
  const mutation = useAuthMutation();
  const signUpMutation = mutation.useSignupMutation();

  const handleSignUp = async () => {
    // Frontend validation
    if (!usernameRegex.test(user.username)) {
      showError(
        'Invalid Username',
        'Username must be 3-20 characters and can only contain letters, numbers, and underscores',
        {
          primaryButtonText: 'Got it',
        }
      );
      return;
    }

    if (!emailRegex.test(user.email)) {
      showError(
        'Invalid Email',
        'Please enter a valid email address',
        {
          primaryButtonText: 'Got it',
        }
      );
      return;
    }

    if (user.password.length < 8) {
      showError(
        'Password Too Short',
        'Password must be at least 8 characters long for security',
        {
          primaryButtonText: 'Okay',
        }
      );
      return;
    }

    // Call mutation
    try {
      const data = await signUpMutation.mutateAsync({
        username: user.username.trim(),
        email: user.email.trim().toLowerCase(),
        password: user.password,
      });

      console.log('Signup success:', data);

      // Backend returns: { success: true, message: "...", data: { userId, email, otpExpires } }
      if (data.success && data.data) {
        showSuccess(
          'Account Created!',
          data.message || 'Please check your email for the verification code',
          {
            autoClose: false,
            primaryButtonText: 'Verify Email',
            onPrimaryPress: () => {
              router.push({
                pathname: '/(auth)/verify/[userId]',
                params: {
                  userId: data.data.userId,
                  email: data.data.email,
                },
              });
            },
          }
        );
      } else {
        // Handle unexpected response format
        showError(
          'Signup Issue',
          'Account created but verification email may not have been sent. Please check your inbox or request a new code.',
          {
            primaryButtonText: 'Continue',
            onPrimaryPress: () => {
              // Try to navigate anyway if we have the data
              if (data.data?.userId && data.data?.email) {
                router.push({
                  pathname: '/(auth)/verify/[userId]',
                  params: {
                    userId: data.data.userId,
                    email: data.data.email,
                  },
                });
              }
            },
          }
        );
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Error is already handled by the mutation's onError
      // But we can add additional handling here if needed
      
      // If the mutation didn't show an error (unlikely), show a generic one
      if (!error.message && !error.response) {
        showError(
          'Signup Failed',
          'An unexpected error occurred. Please try again.',
          {
            primaryButtonText: 'Retry',
            onPrimaryPress: () => handleSignUp(),
          }
        );
      }
    }
  };

  return (
    <ScreenWrapper>
      <Animated.View style={styles.innerContainer}>
        <Logo />
        <Animated.Text
          style={[styles.textHeader, { color: Colors.dark.txtSecondary }]}
          entering={FadeInUp.duration(600).delay(200).springify()}
        >
          Create Account
        </Animated.Text>

        <AnimatedTextInput
          label="Full Name"
          value={user.username}
          onChangeText={(text) => handleTextInputChange('username', text)}
          keyboardType="default"
          placeholder="John Doe"
        />

        <AnimatedTextInput
          label="Email"
          value={user.email}
          onChangeText={(text) => handleTextInputChange('email', text)}
          keyboardType="email-address"
          placeholder="johndoe@gmail.com"
        />

        <AnimatedTextInput
          label="Password"
          value={user.password}
          onChangeText={(text) => handleTextInputChange('password', text)}
          secureTextEntry
          placeholder="********"
        />

        <Button
          title="Sign up"
          disabled={isDisabled || signUpMutation.isPending}
          loading={signUpMutation.isPending}
          onPress={handleSignUp}
        />

        <Animated.View
          style={styles.signInContainer}
          entering={FadeInUp.duration(600).delay(200).springify()}
        >
          <Text style={styles.forgotPasswordText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.forgotPasswordText, { color: Colors.dark.link }]}>
              Sign in
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <ContinueWithGoogle />
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
  textHeader: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: Colors.dark.txtPrimary,
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
  },
  signInContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 25,
    marginBottom: 25,
  },
});

export default SignUp;
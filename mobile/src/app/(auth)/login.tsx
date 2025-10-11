import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import ContinueWithGoogle from '@/src/components/button/ContinueWithGoogle';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { emailRegex } from '@/src/constants/Regex';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '@/src/redux/slices/authSlice';
import type { RootState, AppDispatch } from '@/src/redux/store';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';
import Logo from '@/src/components/logo/Logo';
import { getLoginErrorDetails } from '@/src/utils/errorHandler';

const { width } = Dimensions.get('screen');

interface UserProps {
  email: string;
  password: string;
}

const Index = () => {
  const [user, setUser] = useState<UserProps>({ 
    email: '', 
    password: '' 
  });
  const [isDisabled, setIsDisabled] = useState<boolean>(true);

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, errorCode } = useSelector((state: RootState) => state.auth);

  const {
    AlertComponent,
    showSuccess,
    showError,
    showWarning
  } = useCustomAlert();

  const handleTextInputChange = (name: string, value: string) => {
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const isFilled = user.email.trim() !== '' && user.password.trim() !== '';
    setIsDisabled(!isFilled);
  }, [user]);

  const signIn = async () => {
    // Frontend validation
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

    if (user.password.length < 6) {
      showError(
        'Password Too Short',
        'Password must be at least 6 characters long',
        {
          primaryButtonText: 'Okay',
        }
      );
      return;
    }

    try {
      // Clear any previous errors
      dispatch(clearError());

      // Dispatch login action
      const result = await dispatch(
        loginUser({ 
          email: user.email.trim().toLowerCase(), 
          password: user.password 
        })
      ).unwrap();

      console.log('Login success:', result);

      // Success feedback
      showSuccess(
        'Welcome Back!',
        `Hi ${result.user.username}, you have successfully logged in`,
        {
          autoClose: true,
          autoCloseDelay: 2000,
          primaryButtonText: 'Continue',
        }
      );

      // Navigate after success
      setTimeout(() => {
        router.replace('/(home)');
      }, 2000);

    } catch (err: any) {
      // Enhanced error handling using error codes
      console.error('Login error caught:', err);
      
      // Extract error code and message from the error object
      const code = err?.code || errorCode || null;
      const message = err?.message || error || 'An unexpected error occurred';
      
      // Get user-friendly error details based on error code
      const errorDetails = getLoginErrorDetails(code, message, {
        email: user.email,
        onRetry: () => signIn(),
        onForgotPassword: () => router.push('/(auth)/forgot_password'),
        onResendVerification: () => router.push(`/(auth)/verify/${user.email}`),
        onSignUp: () => router.push('/(auth)/signup')
      });

      // Show error with appropriate action button
      showError(
        errorDetails.title,
        errorDetails.message,
        {
          showCloseButton: true,
          primaryButtonText: errorDetails.actionText,
          onPrimaryPress: errorDetails.action,
        }
      );
    }
  };

  // Optional: Show error from Redux state if it exists
  // This handles errors that might come from other parts of the app
  useEffect(() => {
    if (error && !loading) {
      console.log('Redux error detected:', { error, errorCode });
      
      const errorDetails = getLoginErrorDetails(errorCode, error, {
        email: user.email,
        onRetry: () => signIn(),
        onForgotPassword: () => router.push('/(auth)/forgot_password'),
        onResendVerification: () => router.push(`/(auth)/verify/${user.email}`),
        onSignUp: () => router.push('/(auth)/signup')
      });
      
      showError(
        errorDetails.title,
        errorDetails.message,
        {
          showCloseButton: true,
          primaryButtonText: errorDetails.actionText,
          onPrimaryPress: errorDetails.action,
        }
      );

      // Clear error after showing
      dispatch(clearError());
    }
  }, [error, errorCode, loading]);

  return (
    <ScreenWrapper>
      <Animated.View style={styles.innerContainer}>
        <Logo />
        <Animated.Text
          style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
          entering={FadeInUp.duration(600).springify()}
        >
          Welcome Back
        </Animated.Text>

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

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot_password')}
          style={styles.forgotPasswordContainer}
        >
          <Animated.Text
            style={styles.forgotPasswordText}
            entering={FadeInUp.duration(600).delay(160).springify()}
          >
            Forgot Password?
          </Animated.Text>
        </TouchableOpacity>

        <Button
          title="Login"
          disabled={isDisabled || loading}
          loading={loading}
          onPress={signIn}
        />

        <Animated.View
          style={styles.signUpContainer}
          entering={FadeInUp.duration(600).delay(200).springify()}
        >
          <Text style={styles.forgotPasswordText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={[styles.forgotPasswordText, { color: Colors.dark.link }]}>
              Sign up
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 35,
  },
  forgotPasswordText: {
    color: Colors.dark.txtPrimary,
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
  },
  signUpContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 25,
    marginBottom: 25,
  },
});

export default Index;
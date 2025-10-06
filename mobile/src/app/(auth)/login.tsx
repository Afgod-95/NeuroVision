import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import ContinueWithGoogle from '@/src/components/button/ContinueWithGoogle';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { emailRegex } from '@/src/constants/Regex';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, resetState } from '@/src/redux/slices/authSlice';
import type { RootState, AppDispatch } from '@/src/redux/store';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';

const { width } = Dimensions.get('screen');

interface UserProps {
  email: string;
  password: string;
}

const Index = () => {
  const [user, setUser] = useState<UserProps>({ email: 'afgod98@gmail.com', password: 'expo1234' });
  const [isDisabled, setIsDisabled] = useState<boolean>(true);

  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.auth);

  // Initialize custom alert hook
  const {
    AlertComponent,
    showSuccess,
    showError,
    showWarning
  } = useCustomAlert();

  const handleTextInputChange = (name: string, value: string) => {
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  /*
  useEffect(() => {
    dispatch(resetState())
  },[dispatch])
  */

  useEffect(() => {
    const isFilled = user.email.trim() !== '' && user.password.trim() !== '';
    setIsDisabled(!isFilled);
  }, [user]);

  const signIn = async () => {
    // Validation with custom alerts
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
      showWarning(
        'Password Too Short',
        'Password must be at least 6 characters long',
        {
          primaryButtonText: 'Okay',
        }
      );
      return;
    }

    // Dispatch redux thunk
    dispatch(loginUser({ email: user.email, password: user.password }))
      .unwrap()
      .then((res) => {
        console.log('Login success response:', res);
        showSuccess(
          'Welcome Back!',
          'You have successfully logged in',
          {
            autoClose: true,
            autoCloseDelay: 3000, 
            primaryButtonText: 'Redirecting...',
          }
        );

        // Navigate after alert auto-closes
        setTimeout(() => {
          router.replace('/(home)');
        }, 3000);
      })
      .catch((err) => {
        console.log('Login error:', err);

        let errorTitle = 'Login Failed';
        let errorMessage = typeof err === 'string' ? err : 'Something went wrong. Please try again.';

        if (errorMessage.toLowerCase().includes('invalid')) {
          errorTitle = 'Invalid Credentials';
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorTitle = 'Network Error';
        } else if (errorMessage.toLowerCase().includes('not found')) {
          errorTitle = 'Account Not Found';
        }

        showError(
          errorTitle,
          errorMessage,
          {
            primaryButtonText: 'Try Again',
            secondaryButtonText: 'Forgot Password?',
            onSecondaryPress: () => router.push('/(auth)/forgot_password'),
          }
        );
      });
  };

  return (
    <ScreenWrapper>
      <Animated.View style={styles.innerContainer}>
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
          disabled={isDisabled}
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

      {/* Add the Custom Alert Component */}
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
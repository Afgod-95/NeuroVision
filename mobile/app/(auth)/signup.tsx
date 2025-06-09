import AuthWrapper from '@/src/components/wrapper/AuthWrapper';
import ContinueWithGoogle from '@/src/components/button/ContinueWithGoogle';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { emailRegex, usernameRegex } from '@/src/constants/Regex';
import { FIREBASE_AUTH } from '@/src/lib/FirebaseConfig';
import { router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useSignupMutation } from '@/src/hooks/AuthMutation';

const { width } = Dimensions.get('screen');

interface UserProps {
  username: string;
  email: string;
  password: string;
}

const SignUp = () => {
  const [user, setUser] = useState<UserProps>({
    username: 'Godwin Afari',
    email: 'afgod98@gmail.com',
    password: '123456',
  });

  const [isDisabled, setIsDisabled] = useState<boolean>(true);

  // Ref for Recaptcha
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

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

  //sign up user 
  const signUpMutation = useSignupMutation();
  const handleSignUp = async () => {
    if (!usernameRegex.test(user.username)) {
      Alert.alert('Invalid username');
      return;
    }

    if (!emailRegex.test(user.email)) {
      Alert.alert('Invalid email');
      return;
    }


    if (user.password.length < 6) {
      Alert.alert('Password must be at least 6 characters');
      return;
    }
    signUpMutation.mutate(user);
  };

  return (
    <AuthWrapper>
      {/*Recaptcha Modal */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={FIREBASE_AUTH.app.options}
      />

      <Animated.View style={styles.innerContainer}>
        <Animated.Text
          style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
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
          disabled={isDisabled} 
          loading={signUpMutation.isPending} 
          onPress={handleSignUp} 
        />

        <Animated.View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 5,
            marginTop: 25,
            marginBottom: 25,
          }}
          entering={FadeInUp.duration(600).delay(200).springify()}
        >
          <Text style={styles.forgotPasswordText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)')}>
            <Text style={[styles.forgotPasswordText, { color: Colors.dark.link }]}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>

        <ContinueWithGoogle />
      </Animated.View>
    </AuthWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
});

export default SignUp;

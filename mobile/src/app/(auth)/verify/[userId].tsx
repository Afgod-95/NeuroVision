import React, { useEffect, useState, useCallback } from 'react'
import OTPInput from '@/src/components/textInputs/OtpInput'
import { Colors } from '@/src/constants/Colors'
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation'
import { router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView, Platform,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from 'react-native'
import { useCustomAlert } from '@/src/components/alert/CustomAlert'
import Logo from '@/src/components/logo/Logo'

const RESEND_KEY = 'otp_next_resend_time';
const EmailVerification = () => {
    const params = useLocalSearchParams();
    const [remainingTime, setRemainingTime] = useState(0);

    // Get props from navigation params
    const type = params.type as 'email_verification' | 'password_reset' || 'email_verification';
    const userId = params.userId as string;
    const email = params.email as string;

    console.log('Fetched userId:', userId);
    console.log('Verification type:', type);


    // Initialize mutations
    const mutations = useAuthMutation();

    const emailVerificationMutation = mutations.useVerifyEmailMutation();
    const passwordResetOTPMutation = mutations.useVerifyPasswordResetOTPMutation();
    const resendOtpMutation = mutations.useResendOtpMutation();
    const { AlertComponent, showSuccess, showError } = useCustomAlert();

    // Choose the appropriate mutation based on type
    const currentMutation = type === 'password_reset' ? passwordResetOTPMutation : emailVerificationMutation;

    // Handle OTP verification
    const handleOTPVerification = useCallback((otpCode: string) => {
        if (type === 'password_reset') {
            // For password reset mutation and navigation
            passwordResetOTPMutation.mutate(
                { userId: userId, otpCode },
                {
                    onSuccess: (data) => {
                        router.push({
                            pathname: '/(auth)/reset_password',
                            params: { userId }
                        }); 
                    },
                    onError: (error) => {
                       showError('Ooops!!!', 'An error occured whilst verifying email');
                    }
                }
            );
        } else {
            // For email verification
            emailVerificationMutation.mutate(
                { userId: userId, otpCode },
                {
                    onSuccess: (data) => {
                        showSuccess('Success', 'Email verified successfully!',{
                            autoClose: true
                        });
                        console.log(data.message);
                        setTimeout(() => {
                            router.push({
                                pathname: '/(auth)/login',
                                params: { userId }
                            });
                        }, 2000)
                       
                    },
                    onError: (error) => {
                       showError('Ooops!!!', error.message);
                    }
                }
            );
        }
        console.log('OTP Code:', otpCode, 'Type:', type);
    }, [userId, type, showError, showSuccess, emailVerificationMutation, passwordResetOTPMutation]);

    useEffect(() => {
        const checkResendTime = async () => {
            const storedTime = await AsyncStorage.getItem(RESEND_KEY);
            if (storedTime) {
                const timeDiff = parseInt(storedTime) - Date.now();
                if (timeDiff > 0) {
                    setRemainingTime(Math.ceil(timeDiff / 1000));
                }
            }
        };
        checkResendTime();
    }, []);

    useEffect(() => {
        if (remainingTime <= 0) return;
        const interval = setInterval(() => {
            setRemainingTime(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [remainingTime]);


    // Handle resend code with type-specific logic
    const handleResendCode = useCallback(async () => {
        const nextAllowedTime = Date.now() + 300 * 1000; // 300 seconds from now
        await AsyncStorage.setItem(RESEND_KEY, nextAllowedTime.toString());

        if (typeof email === 'string') {
            if (type === 'password_reset') {
                resendOtpMutation.mutate(
                    { email, type: 'password_reset' },
                    { onSuccess: () => Alert.alert('Success', 'Password reset code sent successfully!') }
                );
            } else {
                resendOtpMutation.mutate(
                    { email, type: 'email_verification' },
                    { onSuccess: () => showSuccess('Success', 'Verification code sent successfully!') }
                );
            }
        } else {
           showError('Oooops!!!', 'No email address found to resend code.');
        }
    }, [email, type, resendOtpMutation, showSuccess, showError]);

    // Get dynamic content based on type
    const getScreenTitle = () => {
        return type === 'password_reset' ? 'Reset Password' : 'Email Verification';
    };

    const getScreenSubtitle = () => {
        return type === 'password_reset'
            ? 'Enter the 6-digit code sent to your email to reset your password'
            : 'Enter the 6-digit code sent to your email address';
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.dark.bgPrimary }]}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <KeyboardAvoidingView
                    style={{ flex: 1, width: '100%' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={100}
                >
                    <Logo />
                    <View style={{ marginHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={styles.title}>{getScreenTitle()}</Text>
                        <Text style={styles.subtitle}>
                            {getScreenSubtitle()}
                        </Text>

                        <OTPInput
                            codeLength={6}
                            onCodeFilled={handleOTPVerification}
                            onResendCode={handleResendCode}
                            resendDelay={remainingTime > 0 ? remainingTime : 300}
                            isLoading={currentMutation.isPending}
                        />
                    </View>
                     <AlertComponent />
                    <Image
                        source={require('../../../assets/images/CircularGradient.png')}
                        style={styles.image}
                    />
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
           
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Manrope-ExtraBold',
        marginBottom: 10,
        color: Colors.dark.txtPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.dark.txtSecondary,
        textAlign: 'center',
        fontFamily: 'Manrope-medium',
        marginBottom: 20,
    },

    image: {
        position: 'absolute',
        bottom: -150,
        left: -150,
        width: 500,
        height: 500,
    },
});

export default EmailVerification;
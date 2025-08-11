import OTPInput from '@/src/components/textInputs/OtpInput'
import { Colors } from '@/src/constants/Colors'
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useCallback } from 'react'
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

const EmailVerification = () => {
    const params = useLocalSearchParams();
    
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
                        Alert.alert('Success', 'OTP verified successfully!', [
                            {
                                text: 'OK',
                                onPress: () => {
                                    router.push({
                                        pathname: '/(auth)/reset_password',
                                        params: { userId }
                                    });
                                }
                            }
                        ]);
                    },
                    onError: (error) => {
                        Alert.alert('Error', error.message || 'Invalid OTP. Please try again.');
                    }
                }
            );
        } else {
            // For email verification
            emailVerificationMutation.mutate(
                { userId: userId, otpCode },
                {
                    onSuccess: (data) => {
                        Alert.alert('Success', data.message, [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setTimeout(() => {
                                        router.push(`/(auth)`);
                                    }, 500); 
                                }
                            }
                        ]);
                    },
                    onError: (error) => {
                        Alert.alert('Error', error.message || 'Invalid OTP. Please try again.');
                    }
                }
            );
        }
        console.log('OTP Code:', otpCode, 'Type:', type);
    }, [userId, type, emailVerificationMutation, passwordResetOTPMutation]);

    // Handle resend code with type-specific logic
    const handleResendCode = useCallback(() => {
        if (typeof email === 'string') {
            if (type === 'password_reset') {
                // Call password reset OTP resend
                resendOtpMutation.mutate(
                    { email, type: 'password_reset' },
                    {
                        onSuccess: () => {
                            Alert.alert('Success', 'Password reset code sent successfully!');
                        },
                        onError: (error) => {
                            Alert.alert('Error', 'Failed to resend code. Please try again.');
                        }
                    }
                );
            } else {
                // Call email verification OTP resend
                resendOtpMutation.mutate(
                    { email, type: 'email_verification' },
                    {
                        onSuccess: () => {
                            Alert.alert('Success', 'Verification code sent successfully!');
                        },
                        onError: (error) => {
                            Alert.alert('Error', 'Failed to resend code. Please try again.');
                        }
                    }
                );
            }
        } else {
            Alert.alert('Error', 'No email address found to resend code.');
        }
    }, [email, type, resendOtpMutation]);

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
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={{ marginHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={styles.title}>{getScreenTitle()}</Text>
                        <Text style={styles.subtitle}>
                            {getScreenSubtitle()}
                        </Text>
                        
                        <OTPInput
                            codeLength={6}
                            onCodeFilled={handleOTPVerification}
                            onResendCode={handleResendCode}
                            resendDelay={300}
                            isLoading={currentMutation.isPending}
                        />
                    </View>
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
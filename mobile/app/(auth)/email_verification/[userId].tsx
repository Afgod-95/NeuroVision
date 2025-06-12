import OTPInput from '@/src/components/textInputs/OtpInput'
import { Colors } from '@/src/constants/Colors'
import { useVerifyEmailMutation, useResendOtpMutation } from '@/src/hooks/auth/AuthMutation'
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
   const { userId, email } = useLocalSearchParams(); 
   console.log('Fetched userId:', userId);
    const emailVerificationMutation = useVerifyEmailMutation();
    const resendOtpMutation = useResendOtpMutation();
   
    //otp codes will be sent automatically when the digits are entered
    const handleOTPVerification = useCallback((otpCode: string) => {
        emailVerificationMutation.mutate({ userId: userId, otpCode });
        console.log(otpCode)
    
    }, [userId, emailVerificationMutation]);

    // Handle resend code
    const handleResendCode = useCallback(() => {
        if (typeof email === 'string') {
            resendOtpMutation.mutate({ email });
        } else {
            // Optionally handling missing email case
            Alert.alert('Error', 'No email address found to resend code.');
        }
    }, [email, resendOtpMutation]);

    return (
        <View style={[styles.container, { backgroundColor: Colors.dark.bgPrimary }]}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <KeyboardAvoidingView
                    style={{ flex: 1, width: '100%' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={{ marginHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={styles.title}>Email Verification</Text>
                        <Text style={styles.subtitle}>
                            Enter the 6-digit code sent to your email address
                        </Text>

                        <OTPInput
                            codeLength={6}
                            onCodeFilled={handleOTPVerification}
                            onResendCode={handleResendCode}
                            resendDelay={300}
                        />
                    </View>
                    <Image
                        source={require('../../../src/assets/images/CircularGradient.png')}
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
        marginBottom: 30,
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






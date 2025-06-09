import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import * as Device from "expo-device";
import Constants from "expo-constants";

//sign up users endpoint 
export const useSignupMutation = () => {
    return useMutation({
        mutationFn: async (user: any) => {
            const result = await axios.post('/api/auth/register', user);
            return result.data;
        },
        onSuccess: (data) => {
            const { userId, email } = data;
            console.log(`User id in signup mut: ${userId}, ${email}`)
            Alert.alert('Success', data.message, [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            router.push({
                                pathname: '/(auth)/email_verification/[userId]',
                                params: {
                                    userId: userId,
                                    email: email
                                }
                            });
                        }, 500); 
                    }
                }
            ]);
        },
        onError: (error) => {
            console.log('Error signing up', error.message)
            Alert.alert('Error', error.message);
        }
    })
}

//resend email
export const useResendOtpMutation = () => {
    return useMutation({
        mutationFn: async ({ email }: { email: string}) => {
            const result = await axios.post('/api/auth/resend-otp', {
                email
            });
            return result.data
        },
        onSuccess: (data) => {
            Alert.alert('Success', data.message);
        },
        onError: (error) => {
             console.log('Error sending otp', error.message);
            console.log(error)
            Alert.alert('Error', error.message);
        }
    })
}

//email verification
export const useVerifyEmailMutation = () => {
    return useMutation({
        mutationFn: async ({ userId, otpCode }: { userId: any; otpCode: string }) => {
            const result = await axios.post('/api/auth/verify-email', {
                userId,
                otpCode
            });
            return result.data;
        },
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
            console.log('Error verifying email', error.message);
            console.log(error)
            Alert.alert('Error', error.message);
        }

    })
}

//login mutation 
export const useLoginUserMutation = () => {
    return useMutation({
        mutationFn: async (user: any) => {
            const deviceData = {
                browser: Constants?.platform?.web ? navigator.userAgent : 'Expo',
                device_name: Device.modelName || 'Unknown',
            };
            const result = await axios.post('/api/auth/login', {
                user,
                deviceData
            });
            return result.data;
        },
        onSuccess: (data) => {
            Alert.alert('Success', data.message, [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            router.push({
                                pathname: '/(home)',
                                params: { userId: data.user.id }
                            });
                        }, 500); 
                    }
                }
            ]);
        },
        onError: (error) => {
            console.log('Error signing up', error.message)
            Alert.alert('Error', error.message);
        }
    })
}
import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import * as Device from "expo-device";

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

//forgot password
export const useForgotPasswordMutation = () => {
    return useMutation({
        mutationFn: async ({ email }: { email: string}) => {
            const result = await axios.post('/api/auth/forgot-password', {
                email
            });
            console.log(result.data)
            return result.data
        },
        onSuccess: (data) => {
            Alert.alert('Success', data.message);
        },
        onError: (error) => {
            console.log('Error sending otp', error.message);
            Alert.alert('An error occured');
        }
    });
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


//delete user account 
interface DeleteUserAccountMutationVariables {
    id: number;
}

export const DeleteUserAccountMutation = () => {
    return useMutation({
        mutationFn: async ({ id } : DeleteUserAccountMutationVariables)  => {
            const response = await axios.delete(`/api/auth/delete-account/${id}`)
            return response.data;
        },  
        onSuccess: (data) => {
            Alert.alert(data.message);
            router.push('/(auth)')
            console.log(data);
        },
        onError: (error) => {
            console.log(error);
        }
    })
}


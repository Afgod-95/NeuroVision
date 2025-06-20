import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import axios from "axios";
import { router } from "expo-router";


//delete user account 
interface DeleteUserAccountMutationVariables {
    id: number;
}

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

export const useVerifyPasswordResetOTPMutation = () => {
    return useMutation({
        mutationFn: async ({ userId, otpCode }: { userId: any; otpCode: string }) => {
            const result = await axios.post('/api/auth/verify-password-reset-otp', {
                userId,
                otpCode
            });
            return result.data;
        },
        onError: (error) => {
            console.log('Error verifying password reset OTP', error.message);
            console.log(error);
        }
    });
};

export const useResendOtpMutation = () => {
    return useMutation({
        mutationFn: async ({ email, type = 'email_verification' }: { email: string; type?: 'email_verification' | 'password_reset' }) => {
            const endpoint = type === 'password_reset' 
                ? '/api/auth/resend-password-reset-otp'
                : '/api/auth/resend-verification-otp';
                        
            const result = await axios.post(endpoint, { email });
            return result.data;
        },
        onError: (error) => {
            console.log('Error resending OTP', error.message);
            console.log(error);
        }
    });
};

// Email Verification Mutation 
export const useVerifyEmailMutation = () => {
    return useMutation({
        mutationFn: async ({ userId, otpCode }: { userId: any; otpCode: string }) => {
            const result = await axios.post('/api/auth/verify-email', {
                userId,
                otpCode
            });
            return result.data;
        },
        onError: (error) => {
            console.log('Error verifying email', error.message);
            console.log(error);
        }
    });
};



export const useForgotPasswordMutation = () => {
    return useMutation({
        mutationFn: async ({ email }: { email: string}) => {
            console.log('Sending request to reset password with email:', email);
            
            try {
                const result = await axios.post('/api/auth/reset-password-request', { email });
                console.log('Response received:', result.data);
                return result.data;
            } catch (error) {
                console.error('Axios error:', error);
                throw error;
            }
        },
        onSuccess: (data) => {
            console.log('Success data:', data);
            Alert.alert('Success', data.message || 'OTP sent successfully');
        },
        onError: (error: any) => {
            console.error('Mutation error:', error);
            
            if (error.response) {
                console.error('Error status:', error.response.status);
                console.error('Error data:', error.response.data);
                
                const errorMessage = error.response.data?.error || 'Failed to send reset code';
                Alert.alert('Error', errorMessage);
            } else if (error.request) {
                console.error('Network error:', error.request);
                Alert.alert('Error', 'Network error. Please check your connection.');
            } else {
                console.error('Unknown error:', error.message);
                Alert.alert('Error', 'An unexpected error occurred.');
            }
        },
        retry: false, 
        retryDelay: 0,
    });
};

export const useDeleteUserAccountMutation = () => {
    return useMutation({
        mutationFn: async ({ id } : DeleteUserAccountMutationVariables)  => {
            const response = await axios.delete(`/api/auth/delete-account/${id}`)
            return response.data
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


import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import api from "@/src/services/axiosClient";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/redux/store";
import { resetState } from "@/src/redux/actions/authSlice";
import { useCustomAlert } from "@/src/components/alert/CustomAlert";
import authApi from "@/src/services/authApiClient";


//delete user account 
interface DeleteUserAccountMutationVariables {
    userId: number;
}


export const useAuthMutation = () => {

    const { accessToken } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const { showSuccess, showError } = useCustomAlert();

    //sign up users endpoint 
    const useSignupMutation = () => {
        return useMutation({
            mutationFn: async (user: any) => {
                const result = await authApi.post('/api/auth/register', user); 
                return result.data;
            },
            
            onError: (error: any) => {
                console.log('Error signing up', error.response?.data || error.message);
                showError('Oops!!!', error.response?.data?.error || 'An error occurred whilst signing up', {
                    autoClose: true
                });
            }
        });
    };


    // resend otp
    const useResendOtpMutation = () => {
        return useMutation({
            mutationFn: async ({ email, type = 'email_verification' }: { email: string; type?: 'email_verification' | 'password_reset' }) => {
                const endpoint = type === 'password_reset'
                    ? '/api/auth/resend-password-reset-otp'
                    : '/api/auth/resend-verification-otp';

                const result = await authApi.post(endpoint, { email });
                return result.data;
            },
            onError: (error) => {
                console.log('Error resending OTP', error.message);
                console.log(error);
                showError('Oops!!!', 'An error occured whilst resending OTP', {
                    autoClose: true
                });
            }
        });
    }

    const useVerifyPasswordResetOTPMutation = () => {
        return useMutation({
            mutationFn: async ({ userId, otpCode }: { userId: any; otpCode: string }) => {
                const result = await authApi.post('/api/auth/verify-password-reset-otp', {
                    userId,
                    otpCode
                });
                return result.data;
            },
            onError: (error) => {
                console.log('Error verifying password reset OTP', error.message);
                console.log(error);
                showError('Oops!!!', 'An error occured whilst signing up', {
                    autoClose: true
                });
            }
        });
    };


    const useForgotPasswordMutation = () => {
        return useMutation({
            mutationFn: async ({ email }: { email: string }) => {
                console.log('Sending request to reset password with email:', email);

                try {
                    const result = await authApi.post('/api/auth/reset-password-request', { email });
                    console.log('Response received:', result.data);
                    return result.data;
                } catch (error) {
                    console.error('Axios error:', error);
                    showError('Oops!!!', 'An error occured whilst sending reset password request', {
                        autoClose: true
                    });
                    throw error;
                }
            },
            onSuccess: (data) => {
                console.log('Success data:', data);
                showSuccess('Success', data.message || 'OTP sent successfully', {
                    autoClose: true
                });
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
    }


    //verify email
    const useVerifyEmailMutation = () => {
        return useMutation({
            mutationFn: async ({ userId, otpCode }: { userId: any; otpCode: string }) => {
                const result = await authApi.post('/api/auth/verify-email', {
                    userId,
                    otpCode
                });
                return result.data;
            },
            onError: (error) => {
                console.log('Error verifying email', error.message);
                console.log(error);
                showError('Oops!!!', 'An error occured whilst verifying email', {
                    autoClose: true
                });
            }
        });


    };

    //delete user account
    const useDeleteUserAccountMutation = () => {
        return useMutation({
            mutationFn: async ({ userId }: DeleteUserAccountMutationVariables) => {
                const response = await api.delete(`/api/auth/delete-account/${userId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                )
                return response.data
            },
            onSuccess: (data) => {
                router.push('/(auth)/login');
                dispatch(resetState());
                showSuccess('Success', 'Account deleted successfully', {
                    autoClose: true
                });
                console.log(data);
            },
            onError: (error) => {
                console.log(error);
                showError('Oops!!!', 'An error occured whilst deleting account', {
                    autoClose: true
                });
            }
        })
    }

    return {
        useSignupMutation,
        useResendOtpMutation,
        useVerifyPasswordResetOTPMutation,
        useForgotPasswordMutation,
        useVerifyEmailMutation,
        useDeleteUserAccountMutation,
    }
}





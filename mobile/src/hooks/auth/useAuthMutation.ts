import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import api from "@/src/services/axiosClient";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/redux/store";
import { resetState } from "@/src/redux/slices/authSlice";
import { useCustomAlert } from "@/src/components/alert/CustomAlert";
import authApi from "@/src/services/authApiClient";
import {
    getRegistrationErrorDetails,
    getOtpErrorDetails,
    getPasswordResetErrorDetails
} from "@/src/utils/errorHandler";

// Delete user account interface
interface DeleteUserAccountMutationVariables {
    userId: number;
}

// Helper function to extract error details from axios error
const extractErrorDetails = (error: any) => {
    if (error.response?.data) {
        const errorData = error.response.data;

        // Backend sends: { success: false, error: { code, message, details } }
        if (errorData.error) {
            return {
                code: errorData.error.code || 'UNKNOWN_ERROR',
                message: errorData.error.message || 'An unexpected error occurred',
                details: errorData.error.details
            };
        }

        // Fallback for different structure
        return {
            code: errorData.code || 'UNKNOWN_ERROR',
            message: errorData.message || errorData.error || 'An unexpected error occurred',
            details: null
        };
    }

    // Network or request errors
    if (error.request) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Network error. Please check your internet connection.',
            details: null
        };
    }

    // Other errors
    return {
        code: 'REQUEST_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: null
    };
};

export const useAuthMutation = () => {
    const { accessToken } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const { showSuccess, showError, showWarning } = useCustomAlert();

    // SIGNUP MUTATION - IMPROVED
    const useSignupMutation = () => {
        return useMutation({
            mutationFn: async (user: any) => {
                const result = await authApi.post('/api/auth/register', user);
                return result.data;
            },

            onSuccess: (data) => {
                console.log("Signup successful:", data);

                // Backend returns: { success: true, message: "...", data: { userId, email, otpExpires } }
                showSuccess(
                    "Account Created!",
                    data.message || "Please check your email for verification code",
                    {
                        autoClose: true,
                        autoCloseDelay: 3000
                    }
                );
            },

            onError: (error: any) => {
                console.log("Error signing up:", error.response?.data || error.message);

                const { code, message } = extractErrorDetails(error);

                const errorDetails = getRegistrationErrorDetails(code, message, {
                    onRetry: undefined, // Can be passed from component
                    onLogin: () => router.push('/(auth)/login')
                });

                showError(
                    errorDetails.title,
                    errorDetails.message,
                    {
                        autoClose: true,
                        primaryButtonText: errorDetails.actionText,
                        onPrimaryPress: errorDetails.action
                    }
                );
            },
        });
    };

    // RESEND OTP MUTATION - IMPROVED
    const useResendOtpMutation = () => {
        return useMutation({
            mutationFn: async ({
                email,
                type = 'email_verification'
            }: {
                email: string;
                type?: 'email_verification' | 'password_reset'
            }) => {
                // Note: You might need to update backend endpoint names
                const endpoint = type === 'password_reset'
                    ? '/api/auth/reset-password-request'
                    : '/api/auth/resend-otp';

                const result = await authApi.post(endpoint, { email });
                return result.data;
            },

            onSuccess: (data) => {
                console.log("OTP resent successfully:", data);

                showSuccess(
                    'Code Sent',
                    data.message || 'A new verification code has been sent to your email',
                    {
                        autoClose: true,
                        autoCloseDelay: 3000
                    }
                );
            },

            onError: (error: any) => {
                console.log('Error resending OTP:', error.response?.data || error.message);

                const { code, message } = extractErrorDetails(error);

                const errorDetails = getOtpErrorDetails(code, message, {
                    onResend: undefined, // Avoid infinite loop
                    onRetry: undefined
                });

                showError(
                    errorDetails.title,
                    errorDetails.message,
                    {
                        autoClose: true,
                        primaryButtonText: errorDetails.actionText,
                        onPrimaryPress: errorDetails.action
                    }
                );
            }
        });
    };

    // VERIFY EMAIL MUTATION - IMPROVED
    const useVerifyEmailMutation = () => {
        return useMutation({
            mutationFn: async ({
                userId,
                otpCode
            }: {
                userId: any;
                otpCode: string
            }) => {
                const result = await authApi.post('/api/auth/verify-email', {
                    userId,
                    otpCode
                });
                return result.data;
            },

            onSuccess: (data) => {
                console.log("Email verified successfully:", data);

                showSuccess(
                    'Email Verified!',
                    data.message || 'Your email has been verified successfully. You can now log in.',
                    {
                        autoClose: true,
                        autoCloseDelay: 2000
                    }
                );
            },

            onError: (error: any) => {
                console.log('Error verifying email:', error.response?.data || error.message);

                const { code, message } = extractErrorDetails(error);

                const errorDetails = getOtpErrorDetails(code, message, {
                    onResend: undefined, // Pass from component
                    onRetry: undefined
                });

                showError(
                    errorDetails.title,
                    errorDetails.message,
                    {
                        autoClose: true,
                        primaryButtonText: errorDetails.actionText,
                        onPrimaryPress: errorDetails.action
                    }
                );
            }
        });
    };

    // FORGOT PASSWORD MUTATION - IMPROVED
    const useForgotPasswordMutation = () => {
        return useMutation({
            mutationFn: async ({ email }: { email: string }) => {
                console.log('Sending password reset request for:', email);

                const result = await authApi.post('/api/auth/reset-password-request', { email });
                console.log('Password reset response:', result.data);
                return result.data;
            },

            onSuccess: (data) => {
                console.log('Password reset success:', data);

                showSuccess(
                    'Reset Link Sent',
                    data.message || 'Password reset instructions have been sent to your email',
                    {
                        autoClose: true,
                        autoCloseDelay: 3000
                    }
                );
            },

            onError: (error: any) => {
                console.error('Password reset error:', error.response?.data || error.message);

                const { code, message } = extractErrorDetails(error);

                const errorDetails = getPasswordResetErrorDetails(code, message, {
                    onRetry: undefined, // Pass from component
                    onSignUp: () => router.push('/(auth)/signup')
                });

                showError(
                    errorDetails.title,
                    errorDetails.message,
                    {
                        autoClose: true,
                        primaryButtonText: errorDetails.actionText,
                        onPrimaryPress: errorDetails.action
                    }
                );
            },

            retry: false,
            retryDelay: 0,
        });
    };

    // VERIFY PASSWORD RESET OTP - IMPROVED
    const useVerifyPasswordResetOTPMutation = () => {
        return useMutation({
            mutationFn: async ({
                userId,
                otpCode
            }: {
                userId: any;
                otpCode: string
            }) => {
                const result = await authApi.post('/api/auth/verify-password-reset-otp', {
                    userId,
                    otpCode
                });
                return result.data;
            },

            onSuccess: (data) => {
                console.log("Password reset OTP verified:", data);

                showSuccess(
                    'Code Verified',
                    data.message || 'Verification successful. You can now reset your password.',
                    {
                        autoClose: true,
                        autoCloseDelay: 2000
                    }
                );
            },

            onError: (error: any) => {
                console.log('Error verifying password reset OTP:', error.response?.data || error.message);

                const { code, message } = extractErrorDetails(error);

                const errorDetails = getOtpErrorDetails(code, message, {
                    onResend: undefined, // Pass from component
                    onRetry: undefined
                });

                showError(
                    errorDetails.title,
                    errorDetails.message,
                    {
                        autoClose: true,
                        primaryButtonText: errorDetails.actionText,
                        onPrimaryPress: errorDetails.action
                    }
                );
            }
        });
    };

    // DELETE USER ACCOUNT - IMPROVED

    const useDeleteUserAccountMutation = () => {
        return useMutation({
            mutationFn: async ({ userId }: DeleteUserAccountMutationVariables) => {
                console.log(`Delete user access token: ${accessToken}`);
                const response = await api.delete(`/api/auth/delete-account/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                return response.data;
            },
            // Remove onSuccess and onError from here
            // Let the component handle them
        });
    };

    return {
        useSignupMutation,
        useResendOtpMutation,
        useVerifyPasswordResetOTPMutation,
        useForgotPasswordMutation,
        useVerifyEmailMutation,
        useDeleteUserAccountMutation,
    };
};
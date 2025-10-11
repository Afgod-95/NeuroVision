// src/utils/errorHandler.ts

/**
 * Backend Error Response Structure
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     details?: any
 *   }
 * }
 */

export interface ErrorDetails {
  title: string;
  message: string;
  actionText?: string;
  action?: () => void;
}

// Error code constants matching your backend
export const ERROR_CODES = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // User Management
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // OTP
  ALREADY_VERIFIED: 'ALREADY_VERIFIED',
  OTP_SEND_FAILED: 'OTP_SEND_FAILED',
  OTP_EXPIRED: 'OTP_EXPIRED',
  INVALID_OTP: 'INVALID_OTP',
  
  // Operations
  USER_CREATION_FAILED: 'USER_CREATION_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  LOGOUT_FAILED: 'LOGOUT_FAILED',
  LOGOUT_ALL_FAILED: 'LOGOUT_ALL_FAILED',
  
  // Rate Limiting
  REQUEST_IN_PROGRESS: 'REQUEST_IN_PROGRESS',
  
  // Network/General
  NETWORK_ERROR: 'NETWORK_ERROR',
  REQUEST_ERROR: 'REQUEST_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Maps backend error codes to user-friendly error details for LOGIN
 */
export const getLoginErrorDetails = (
  errorCode?: string | null,
  errorMessage?: string | null,
  options?: {
    email?: string;
    onRetry?: () => void;
    onForgotPassword?: () => void;
    onResendVerification?: () => void;
    onSignUp?: () => void;
  }
): ErrorDetails => {
  const {
    email,
    onRetry,
    onForgotPassword,
    onResendVerification,
    onSignUp
  } = options || {};

  switch (errorCode) {
    case ERROR_CODES.INVALID_CREDENTIALS:
      return {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect. Please try again.',
        actionText: onForgotPassword ? 'Forgot Password?' : undefined,
        action: onForgotPassword
      };

    case ERROR_CODES.EMAIL_NOT_VERIFIED:
      return {
        title: 'Email Not Verified',
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        actionText: onResendVerification ? 'Resend Verification' : undefined,
        action: onResendVerification
      };

    case ERROR_CODES.USER_NOT_FOUND:
      return {
        title: 'Account Not Found',
        message: 'No account exists with this email address. Would you like to sign up?',
        actionText: onSignUp ? 'Sign Up' : undefined,
        action: onSignUp
      };

    case ERROR_CODES.NETWORK_ERROR:
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        actionText: onRetry ? 'Retry' : undefined,
        action: onRetry
      };

    case ERROR_CODES.INTERNAL_ERROR:
      return {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        actionText: onRetry ? 'Retry' : undefined,
        action: onRetry
      };

    case ERROR_CODES.VALIDATION_ERROR:
      return {
        title: 'Invalid Input',
        message: errorMessage || 'Please check your email and password.',
        actionText: 'Try Again',
        action: undefined
      };

    case ERROR_CODES.UNAUTHORIZED:
      return {
        title: 'Unauthorized',
        message: 'Your session has expired. Please log in again.',
        actionText: undefined,
        action: undefined
      };

    default:
      // Fallback: try to parse the error message
      if (errorMessage) {
        const lowerError = errorMessage.toLowerCase();
        
        if (lowerError.includes('network') || lowerError.includes('connection')) {
          return {
            title: 'Network Error',
            message: 'Please check your internet connection and try again.',
            actionText: onRetry ? 'Retry' : undefined,
            action: onRetry
          };
        }
        
        if (lowerError.includes('timeout')) {
          return {
            title: 'Request Timeout',
            message: 'The request took too long. Please try again.',
            actionText: onRetry ? 'Retry' : undefined,
            action: onRetry
          };
        }
      }

      return {
        title: 'Login Failed',
        message: errorMessage || 'An unexpected error occurred. Please try again.',
        actionText: onRetry ? 'Try Again' : undefined,
        action: onRetry
      };
  }
};

/**
 * Maps backend error codes to user-friendly error details for REGISTRATION
 */
export const getRegistrationErrorDetails = (
  errorCode?: string | null,
  errorMessage?: string | null,
  options?: {
    onRetry?: () => void;
    onLogin?: () => void;
  }
): ErrorDetails => {
  const { onRetry, onLogin } = options || {};

  switch (errorCode) {
    case ERROR_CODES.USER_EXISTS:
    case ERROR_CODES.EMAIL_EXISTS:
      return {
        title: 'Account Already Exists',
        message: 'An account with this email already exists. Would you like to log in instead?',
        actionText: onLogin ? 'Log In' : undefined,
        action: onLogin
      };

    case ERROR_CODES.VALIDATION_ERROR:
      return {
        title: 'Invalid Information',
        message: errorMessage || 'Please check your information and try again.',
        actionText: 'Try Again',
        action: undefined
      };

    case ERROR_CODES.USER_CREATION_FAILED:
      return {
        title: 'Registration Failed',
        message: 'We couldn\'t create your account. Please try again.',
        actionText: onRetry ? 'Retry' : undefined,
        action: onRetry
      };

    case ERROR_CODES.OTP_SEND_FAILED:
    case ERROR_CODES.EMAIL_SEND_FAILED:
      return {
        title: 'Email Delivery Failed',
        message: 'Your account was created but we couldn\'t send the verification email. You can request a new one.',
        actionText: 'Continue',
        action: undefined
      };

    case ERROR_CODES.NETWORK_ERROR:
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        actionText: onRetry ? 'Retry' : undefined,
        action: onRetry
      };

    default:
      return {
        title: 'Registration Failed',
        message: errorMessage || 'An unexpected error occurred during registration.',
        actionText: onRetry ? 'Try Again' : undefined,
        action: onRetry
      };
  }
};

/**
 * Maps backend error codes to user-friendly error details for OTP VERIFICATION
 */
export const getOtpErrorDetails = (
  errorCode?: string | null,
  errorMessage?: string | null,
  options?: {
    onResend?: () => void;
    onRetry?: () => void;
  }
): ErrorDetails => {
  const { onResend, onRetry } = options || {};

  switch (errorCode) {
    case ERROR_CODES.INVALID_OTP:
      return {
        title: 'Invalid Code',
        message: 'The verification code you entered is incorrect. Please try again.',
        actionText: onRetry ? 'Try Again' : undefined,
        action: onRetry
      };

    case ERROR_CODES.OTP_EXPIRED:
      return {
        title: 'Code Expired',
        message: 'This verification code has expired. Please request a new one.',
        actionText: onResend ? 'Resend Code' : undefined,
        action: onResend
      };

    case ERROR_CODES.ALREADY_VERIFIED:
      return {
        title: 'Already Verified',
        message: 'This email address has already been verified. You can now log in.',
        actionText: 'Continue',
        action: undefined
      };

    case ERROR_CODES.USER_NOT_FOUND:
      return {
        title: 'Account Not Found',
        message: 'We couldn\'t find your account. Please try registering again.',
        actionText: undefined,
        action: undefined
      };

    case ERROR_CODES.VERIFICATION_FAILED:
      return {
        title: 'Verification Failed',
        message: 'We couldn\'t verify your code. Please try again.',
        actionText: onRetry ? 'Retry' : undefined,
        action: onRetry
      };

    default:
      return {
        title: 'Verification Failed',
        message: errorMessage || 'An error occurred during verification.',
        actionText: onRetry ? 'Try Again' : undefined,
        action: onRetry
      };
  }
};

/**
 * Maps backend error codes to user-friendly error details for PASSWORD RESET
 */
export const getPasswordResetErrorDetails = (
  errorCode?: string | null,
  errorMessage?: string | null,
  options?: {
    onRetry?: () => void;
    onSignUp?: () => void;
  }
): ErrorDetails => {
  const { onRetry, onSignUp } = options || {};

  switch (errorCode) {
    case ERROR_CODES.USER_NOT_FOUND:
      return {
        title: 'Account Not Found',
        message: 'No account exists with this email address.',
        actionText: onSignUp ? 'Sign Up' : undefined,
        action: onSignUp
      };

    case ERROR_CODES.EMAIL_NOT_VERIFIED:
      return {
        title: 'Email Not Verified',
        message: 'Please verify your email address before resetting your password.',
        actionText: undefined,
        action: undefined
      };

    case ERROR_CODES.EMAIL_SEND_FAILED:
      return {
        title: 'Email Delivery Failed',
        message: 'We couldn\'t send the password reset email. Please try again.',
        actionText: onRetry ? 'Retry' : undefined,
        action: onRetry
      };

    case ERROR_CODES.REQUEST_IN_PROGRESS:
      return {
        title: 'Request In Progress',
        message: 'A password reset request is already being processed. Please wait a moment.',
        actionText: undefined,
        action: undefined
      };

    case ERROR_CODES.INVALID_PASSWORD:
      return {
        title: 'Invalid Password',
        message: 'Your current password is incorrect.',
        actionText: 'Try Again',
        action: undefined
      };

    default:
      return {
        title: 'Password Reset Failed',
        message: errorMessage || 'An error occurred while resetting your password.',
        actionText: onRetry ? 'Try Again' : undefined,
        action: onRetry
      };
  }
};

/**
 * Generic error handler - automatically detects context
 */
export const getErrorDetails = (
  errorCode?: string | null,
  errorMessage?: string | null,
  context: 'login' | 'registration' | 'otp' | 'password-reset' = 'login',
  options?: any
): ErrorDetails => {
  switch (context) {
    case 'login':
      return getLoginErrorDetails(errorCode, errorMessage, options);
    case 'registration':
      return getRegistrationErrorDetails(errorCode, errorMessage, options);
    case 'otp':
      return getOtpErrorDetails(errorCode, errorMessage, options);
    case 'password-reset':
      return getPasswordResetErrorDetails(errorCode, errorMessage, options);
    default:
      return {
        title: 'Error',
        message: errorMessage || 'An unexpected error occurred.',
        actionText: 'Try Again',
        action: options?.onRetry
      };
  }
};
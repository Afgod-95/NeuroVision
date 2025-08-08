"use client"
import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, Shield, Brain, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

// TypeScript interfaces
interface FormData {
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

interface PasswordRequirement {
  label: string;
  test: (pwd: string) => boolean;
}

interface PasswordStrength {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
  width: string;
}

const ResetPasswordScreen: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: 'One number', test: (pwd: string) => /\d/.test(pwd) },
    { label: 'One special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ];

  const getPasswordStrength = (): PasswordStrength => {
    const passed = passwordRequirements.filter(req => req.test(formData.newPassword)).length;
    if (passed <= 2) return { strength: 'weak', color: 'bg-red-500', width: '25%' };
    if (passed <= 3) return { strength: 'fair', color: 'bg-yellow-500', width: '50%' };
    if (passed <= 4) return { strength: 'good', color: 'bg-blue-500', width: '75%' };
    return { strength: 'strong', color: 'bg-green-500', width: '100%' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const handleSubmit = async (): Promise<void> => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Password reset successfully for NeuroVision account');
      setIsSuccess(true);
    } catch (error) {
      console.error('Password reset failed:', error);
      // Handle error (show error message, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  const strength = getPasswordStrength();

  // Success Screen JSX
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5 py-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="fixed bottom-0 right-[-50px] w-[200px] h-[200px] rounded-full blur-3xl"
            style={{
              background: '#10b981', 
              filter: 'blur(60px)', 
              opacity: 0.4, 
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <motion.div
          className="w-full max-w-md px-5 relative z-10 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Success Icon */}
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-8 shadow-2xl shadow-green-500/25"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.2,
              type: "spring",
              stiffness: 200 
            }}
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>

          {/* Success Message */}
          <motion.h1
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Password Updated!
          </motion.h1>

          <motion.p
            className="text-gray-400 text-lg mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Your password has been successfully updated.
            <br />
            You can now sign in to your account.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <motion.button
              onClick={() =>console.log("open app")}
              className="group w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl font-semibold text-lg text-white transition-all duration-300 relative overflow-hidden shadow-lg hover:shadow-purple-500/25"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">Open NeuroVision App</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </motion.button>

            <motion.button
              onClick={() => window.location.href = '/login'}
              className="w-full py-3 border border-gray-600 hover:border-gray-500 rounded-xl font-medium text-gray-300 hover:text-white transition-all duration-300"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Sign In on Web
            </motion.button>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <p className="text-gray-600 text-xs">
              Secured & Encrypted
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5 py-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="fixed bottom-0 left-[-50px] w-[200px] h-[200px] rounded-full blur-3xl"
            style={{
              background: '#9747FF', 
              filter: 'blur(60px)', 
              opacity: 0.4, 
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="mb-10">
                    
          {/* Brand Header */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* NeuroVision Logo/Icon */}
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl mb-6 shadow-2xl shadow-purple-500/25"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain className="w-8 h-8 text-white" />
            </motion.div>
            
            <motion.h1 
              className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Reset Password
            </motion.h1>
            
            <motion.p 
              className="text-gray-400 text-base mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Create a new secure password for your account
            </motion.p>
          </motion.div>
        </div>

        {/* Form */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          onKeyPress={handleKeyPress}
        >
          {/* New Password Field */}
          <div className="space-y-3">
            <div className="relative group">
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('newPassword')}
                onBlur={() => setFocusedField('')}
                placeholder="New Password"
                autoComplete="new-password"
                className={`w-full px-4 py-4 bg-gray-800 border rounded-xl text-white placeholder-gray-400 focus:outline-none transition-all duration-300 ${
                  errors.newPassword 
                    ? 'border-red-500 focus:border-red-500 shadow-lg shadow-red-500/10' 
                    : focusedField === 'newPassword'
                    ? 'border-purple-500 focus:border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Password strength</span>
                  <span className={`font-medium capitalize ${
                    strength.strength === 'weak' ? 'text-red-400' :
                    strength.strength === 'fair' ? 'text-yellow-400' :
                    strength.strength === 'good' ? 'text-blue-400' :
                    'text-green-400'
                  }`}>
                    {strength.strength}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    className={`h-full ${strength.color} rounded-full`}
                    initial={{ width: '0%' }}
                    animate={{ width: strength.width }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
            
            {errors.newPassword && (
              <motion.p 
                className="text-red-400 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {errors.newPassword}
              </motion.p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="relative group">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField('')}
              placeholder="Confirm Password"
              autoComplete="new-password"
              className={`w-full px-4 py-4 bg-gray-800 border rounded-xl text-white placeholder-gray-400 focus:outline-none transition-all duration-300 ${
                errors.confirmPassword 
                  ? 'border-red-500 focus:border-red-500 shadow-lg shadow-red-500/10' 
                  : focusedField === 'confirmPassword'
                  ? 'border-purple-500 focus:border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            
            {/* Match indicator */}
            {formData.confirmPassword && formData.newPassword && (
              <motion.div 
                className={`absolute right-12 top-1/2 transform -translate-y-1/2 ${
                  formData.newPassword === formData.confirmPassword ? 'text-green-400' : 'text-red-400'
                }`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Check className="w-4 h-4" />
              </motion.div>
            )}
          </div>
          
          {errors.confirmPassword && (
            <motion.p 
              className="text-red-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {errors.confirmPassword}
            </motion.p>
          )}

          {/* Submit Button */}
          <motion.button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`group w-full py-3 rounded-xl font-semibold text-lg transition-all duration-300 relative overflow-hidden ${
              isLoading
                ? 'bg-purple-400 cursor-not-allowed opacity-70'
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 hover:shadow-lg hover:shadow-purple-500/25'
            } text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black`}
            whileHover={isLoading ? {} : { scale: 1.02, y: -2 }}
            whileTap={isLoading ? {} : { scale: 0.98 }}
            type="button"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <motion.div 
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Securing Your Account...</span>
              </div>
            ) : (
              <>
                <span className="relative z-10">Update Password</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Password Requirements */}
        {formData.newPassword && (
          <motion.div 
            className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-purple-400" />
              Security Requirements
            </h3>
            <div className="space-y-3">
              {passwordRequirements.map((req, index) => (
                <motion.div 
                  key={index} 
                  className={`flex items-center text-sm transition-all duration-300 ${
                    req.test(formData.newPassword) 
                      ? 'text-green-400' 
                      : 'text-gray-400'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.3 + (index * 0.1) }}
                >
                  <motion.div 
                    className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center border transition-all duration-300 ${
                      req.test(formData.newPassword) 
                        ? 'bg-green-400 border-green-400' 
                        : 'border-gray-600'
                    }`}
                    animate={req.test(formData.newPassword) ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {req.test(formData.newPassword) && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                  <span className={req.test(formData.newPassword) ? 'font-medium' : ''}>
                    {req.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer Note */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          <p className="text-gray-500 text-sm">
            Secured by NeuroVision AI • Your data is encrypted and protected
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordScreen;
import { useEffect } from 'react';
import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation';
import { emailRegex } from '@/src/constants/Regex';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';

const { width } = Dimensions.get('screen')

interface UserProps {
    email: string;
}

const ForgotPassword = () => {
    
    const { useForgotPasswordMutation } = useAuthMutation();
    const { AlertComponent, showError } = useCustomAlert();
    
    const [user, setUser] = useState<UserProps>({
        email: ''
    })



    const [isDisabled, setIsDisabled] = useState<boolean>(false)

    const handleTextInputChange = (name: string, value: string) => {
        setUser({ ...user, [name]: value });
    };

    useEffect(() => {
            const isFilled = user.email.trim();
            setIsDisabled(!isFilled);
        }, [user]);

    const forgotPasswordMutation = useForgotPasswordMutation();

    

    const handleForgotPassword = async () => {
        if (!emailRegex.test(user.email)){
            showError('Error','Please enter a valid email')
            return
        }
        try {   
            forgotPasswordMutation.mutate(user);
            const data = await forgotPasswordMutation.mutateAsync(user)
            const { user: userDetails } = data;
            router.push({
                pathname: '/(auth)/verify/[userId]',
                params: {
                    userId: userDetails.id,
                    email: userDetails.email,
                    type: 'password_reset'
                }
            })
            
        
        } catch (error: any) {
            console.log(error.message)
        }
       
    }

    return (
        <ScreenWrapper>
            <Animated.View style={styles.innerContainer}>
                <Animated.View>
                    <Animated.Text 
                        style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
                        entering={FadeInUp.duration(600).springify()}
                    >
                        Forgot Your Password?
                    </Animated.Text>
                    <Animated.Text 
                        style={styles.subtitle}
                        entering={FadeInUp.duration(600).delay(100).springify()}
                    >
                       Don&apos;t worry! It happens to the best of us. Enter your registered email address below, and we’ll send you a link to reset your password.
                    </Animated.Text>
                </Animated.View>

                <AnimatedTextInput
                    label="Email"
                    value={user.email}
                    onChangeText={(text) => handleTextInputChange('email', text)}
                    keyboardType="email-address"
                    placeholder='johndoe@gmail.com'
                />
                
                <Button
                    title='Reset'
                    disabled={isDisabled}
                    loading={forgotPasswordMutation.isPending}
                    onPress={handleForgotPassword}
                />
            </Animated.View>
            <AlertComponent />
        </ScreenWrapper>
    )
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    innerContainer: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 60,
        width: width > 768 ? width / 2 : width,
        paddingHorizontal: 20
    },
    textHeader: {
        fontFamily: 'Manrope-ExtraBold',
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 10
    },

    subtitle: {
        fontSize: 14,
        color: Colors.dark.txtSecondary,
        textAlign: 'center',
        fontFamily: 'Manrope-medium',
        marginBottom: 40,
    },

    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginBottom: 35,
    },

    forgotPasswordText: {
        color: Colors.dark.txtPrimary,
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
    }
})

export default ForgotPassword
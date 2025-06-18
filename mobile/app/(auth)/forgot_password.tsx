import { useEffect } from 'react';
import AuthWrapper from '@/src/components/wrapper/AuthWrapper';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useForgotPasswordMutation } from '@/src/hooks/auth/AuthMutation';
import { emailRegex } from '@/src/constants/Regex';

const { width } = Dimensions.get('screen')

interface UserProps {
    email: string;
}

const ForgotPassword = () => {
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
            Alert.alert('Please enter a valid email')
            return
        }
        try {   
            forgotPasswordMutation.mutate(user);
            const data = await forgotPasswordMutation.mutateAsync(user)
            console.log(user)
            console.log(data)
            router.push('/(auth)/email_verification/[userId]', {
                userId: data?.user?.Id,
                email: data?.user?.email,
            })
            
        
        } catch (error: any) {
            console.log(error.message)
        }
       
    }

    return (
        <AuthWrapper>
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
        </AuthWrapper>
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
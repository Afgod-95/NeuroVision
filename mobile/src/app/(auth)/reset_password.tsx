import ScreenWrapper from '@/src/components/wrapper/ScreenWrapper';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('screen')

interface UserProps {
    email: string;
    password: string;
    confirmPassword: string;
}

const ResetPassword = () => {
    const [user, setUser] = useState<UserProps>({
        email: '',
        password: '',
        confirmPassword: ''
    })

    const handleTextInputChange = (name: string, value: string) => {
        setUser({ ...user, [name]: value });
    };

    return (
        <ScreenWrapper>
            <Animated.View style={styles.innerContainer}>
                <Animated.View>
                    <Animated.Text 
                        style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
                        entering={FadeInUp.duration(600).springify()}
                    >
                        Reset Your Password
                    </Animated.Text>
                    <Animated.Text 
                        style={styles.subtitle}
                        entering={FadeInUp.duration(600).delay(100).springify()}
                    >
                      Create a new password for your account. Make sure it&apos;s strong and easy for you to remember.
                    </Animated.Text>
                </Animated.View>

                <AnimatedTextInput
                    label="Password"
                    value={user.password}
                    onChangeText={(text) => handleTextInputChange('password', text)}
                    keyboardType="default"
                    placeholder='Enter a strong password'
                />

                 <AnimatedTextInput
                    label="Confirm Password"
                    value={user.confirmPassword}
                    onChangeText={(text) => handleTextInputChange('password', text)}
                    keyboardType="default"
                    placeholder='Enter same password'
                />
                
                <Button
                    title='Submit'
                    disabled={false}
                    loading={false}
                    onPress={() => router.push({
                        pathname: '/(auth)/email_verification/[userId]',
                        params: {
                            userId: user.email 
                        }
                    })}
                />
            
            </Animated.View>
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

export default ResetPassword
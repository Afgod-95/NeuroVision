import AuthWrapper from '@/src/components/wrapper/AuthWrapper';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('screen')

interface UserProps {
    email: string;
    password: string;
}

const ForgotPassword = () => {
    const [user, setUser] = useState<UserProps>({
        email: '',
        password: '',
    })

    const handleTextInputChange = (name: string, value: string) => {
        setUser({ ...user, [name]: value });
    };

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
                    disabled={false}
                    loading={false}
                    onPress={() => router.push('/(auth)/email_verification')}
                />
                <Animated.View
                    style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 5,
                        marginTop: 40,
                        marginBottom: 25
                    }}
                    entering={FadeInUp.duration(600).delay(200).springify()}
                >
                    <Text style={styles.forgotPasswordText}>Remembered your account?</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)')}>
                        <Text style={[styles.forgotPasswordText, { color: Colors.dark.link }]}>Login</Text>
                    </TouchableOpacity>
                </Animated.View>
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
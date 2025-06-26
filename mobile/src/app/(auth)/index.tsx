import AuthWrapper from '@/src/components/wrapper/AuthWrapper';
import ContinueWithGoogle from '@/src/components/button/ContinueWithGoogle';
import Button from '@/src/components/button/CustomButton';
import AnimatedTextInput from '@/src/components/textInputs/Input';
import { Colors } from '@/src/constants/Colors';
import { emailRegex, passwordRegex } from '@/src/constants/Regex';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { login } from '@/src/redux/slices/authSlice';
import * as Device from "expo-device";
import Constants from "expo-constants";


const { width } = Dimensions.get('screen')

interface UserProps {
    email: string;
    password: string;
}

const Index = () => {
    const [user, setUser] = useState<UserProps>({
        email: '',
        password: '',
    });

    const dispatch = useDispatch();

    const [isDisabled, setIsDisabled] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleTextInputChange = (name: string, value: string) => {
        setUser({ ...user, [name]: value });
    };

    useEffect(() => {
        const isFilled = user.email.trim() !== '' && user.password.trim() !== '';
        setIsDisabled(!isFilled);
    }, [user]);


    
    const signIn = async () => {
        
        if (!emailRegex.test(user.email)){
            Alert.alert('Please enter a valid email');
            return;
        }

        if (user.password.length < 6){
            Alert.alert('Password must be at least 6 characters long');
            return;
        }
        try {
            setIsLoading(true);
            const deviceData = {
                browser: Constants?.platform?.web ? navigator.userAgent : 'Expo',
                device_name: Device.modelName || 'Unknown',
            };
            const response = await axios.post('/api/auth/login', {
                email: user.email,
                password: user.password,
                //deviceData
            });
            if (response.status === 200){
                dispatch(login(response.data.user));
                Alert.alert('Success', response.data.message, [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                           router.push('/(home)')
                        }, 500); 
                    }
                }
            ]);
            }
            
        } catch (error: any) {
            Alert.alert('Error', error.message);
            console.log(error.message);
        }
        finally {
            setIsLoading(false)
        }
       
    }

    return (
        <AuthWrapper>
            <Animated.View style={styles.innerContainer}>
                <Animated.Text style={[styles.textHeader, { color: Colors.dark.txtPrimary }]}
                    entering={FadeInUp.duration(600).springify()}
                >
                    Welcome Back
                </Animated.Text>
                <AnimatedTextInput
                    label="Email"
                    value={user.email}
                    onChangeText={(text) => handleTextInputChange('email', text)}
                    keyboardType="email-address"
                    placeholder='johndoe@gmail.com'
                />
                <AnimatedTextInput
                    label="Password"
                    value={user.password}
                    onChangeText={(text) => handleTextInputChange('password', text)}
                    secureTextEntry
                    placeholder='********'
                />
                <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot_password')}
                    style={
                        styles.forgotPasswordContainer
                    }
                >
                    <Animated.Text
                        style={styles.forgotPasswordText}
                        entering={FadeInUp.duration(600).delay(160).springify()}
                    >
                        Forgot Password?
                    </Animated.Text>
                </TouchableOpacity>
                <Button
                    title='Login'
                    disabled={isDisabled}
                    loading={isLoading}
                    onPress={signIn}
                />
                <Animated.View
                    style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 5,
                        marginTop: 25,
                        marginBottom: 25
                    }}
                    entering={FadeInUp.duration(600).delay(200).springify()}
                >
                    <Text style={styles.forgotPasswordText}>Don&apos;t have an account?</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                        <Text style={[styles.forgotPasswordText, { color: Colors.dark.link }]}>Sign up</Text>
                    </TouchableOpacity>
                </Animated.View>

                <ContinueWithGoogle />
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
        marginBottom: 25
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

export default Index
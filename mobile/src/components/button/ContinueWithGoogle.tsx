import { Colors } from '@/src/constants/Colors';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

const ContinueWithGoogle = () => {
    const scale = useSharedValue(1);

    // Configure Google Auth Request
   

    // Handle Google Sign-In with Firebase
    const handleGoogleSignIn = async (idToken?: string, accessToken?: string) => {
        try {
            if (!idToken) {
                console.error('No ID token received');
                return;
            }
        } catch (error) {
            console.error('Google Sign-In error:', error);
        }
    };

    // Handle Sign-In button press
    const handleSign = async () => {
        try {
            console.log('pressed')
        } catch (error) {
            console.error('Error initiating Google Sign-In:', error);
        }
    };

    // Animated style for scaling button
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 10, stiffness: 150 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 150 });
    };

    return (
        <Animated.View
            entering={FadeInUp.duration(600).delay(200).springify()}
            style={{
                ...styles.container,
            }}
        >
            <View style={styles.orContainer}>
                <View style={styles.line} />
                <Text style={styles.text}>Or</Text>
                <View style={styles.line} />
            </View>
            <Animated.View style={[animatedStyle, { width: '100%' }]}>
                <Pressable
                    onPress={handleSign}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={false}
                    style={{
                        backgroundColor: Colors.dark.bgSecondary,
                        height: 40,
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 20,
                        alignItems: 'center',
                        width: '100%',
                        paddingHorizontal: 15,
                        paddingVertical: 10,
                        borderRadius: 10,
                        opacity: true ? 0.5 : 1,
                    }}
                >
                    <Image source={require('../../assets/images/Google-icon.png')} style={{ width: 24, height: 24 }} />
                    <Text style={{ color: '#fff', fontSize: 16 }}>Continue with Google</Text>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 15,
    },
    orContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        alignItems: 'baseline',
        marginBottom: 20,
    },
    line: {
        height: 1,
        backgroundColor: Colors.dark.txtPrimary,
        width: 50,
    },
    text: {
        color: Colors.dark.txtPrimary,
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
    }
});

export default ContinueWithGoogle;
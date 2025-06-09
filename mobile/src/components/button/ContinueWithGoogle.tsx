import { Colors } from '@/src/constants/Colors';
import { FIREBASE_AUTH, FIREBASE_DB } from '@/src/lib/FirebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    // Handle the response from Google Auth
    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            handleGoogleSignIn(authentication?.idToken, authentication?.accessToken);
        } else if (response?.type === 'error') {
            console.error('Google Auth Error:', response.error);
            if (response.error?.message?.includes('access_blocked')) {
                console.error('Access blocked - check OAuth consent screen configuration');
            }
        }
    }, [response]);

    // Handle Google Sign-In with Firebase
    const handleGoogleSignIn = async (idToken?: string, accessToken?: string) => {
        try {
            if (!idToken) {
                console.error('No ID token received');
                return;
            }

            console.log('Processing Google Sign-In...');

            // Create Firebase credential
            const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);

            // Sign in to Firebase
            const result = await signInWithCredential(FIREBASE_AUTH, googleCredential);
            const user = result.user;

            // Save user data to Firestore
            const userRef = doc(FIREBASE_DB, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    uid: user.uid,
                    lastLogin: new Date().toISOString()
                });
            }

            console.log('Google Sign-In successful');
            // Navigate to next screen if needed
            // router.push('/home');

        } catch (error) {
            console.error('Google Sign-In error:', error);
        }
    };

    // Handle Sign-In button press
    const handleSign = async () => {
        try {
            console.log('Starting Google Sign-In...');
            console.log('Request object:', request);
            console.log('Client IDs:', {
                web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
                android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
                ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
            });
            await promptAsync();
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
                    disabled={!request}
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
                        opacity: !request ? 0.5 : 1,
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
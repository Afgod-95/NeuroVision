import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { Colors } from '@/src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

//Custom back button
const BackButton = () => {
    return (
        <TouchableOpacity style={styles.backButton} onPress = {() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color={Colors.dark.txtPrimary} />
            <Text style={styles.text}>Back</Text>
        </TouchableOpacity>
    )
}

const _layout = () => {

    const headerStyle = {
        backgroundColor: Colors.dark.bgPrimary,
        height: 60,
    }
    return (
        <View style={styles.container}>
            <Stack
               
            >
                <Stack.Screen name="login" options={{ headerShown: false }}/>
                <Stack.Screen name="signup" options={{ headerShown: false }}/>
               
                <Stack.Screen
                    name="verify/[userId]"
                    options={{
                        headerShown: true,
                        headerTitle: '',
                        headerStyle: headerStyle,
                        headerShadowVisible: false,
                        headerLeft: () => {
                            return (
                                <BackButton />
                            )
                        }
                    }}
                />
                <Stack.Screen
                    name="forgot_password"
                    options={{
                        headerShown: true,
                        title: '',
                        headerShadowVisible: false,
                        headerStyle: headerStyle,
                        headerLeft: () => {
                            return (
                                <BackButton />
                            )
                        }
                    }}
                />

                <Stack.Screen
                    name="reset_password"
                    options={{
                       headerShown: true,
                        title: '',
                        headerShadowVisible: false,
                        headerStyle: headerStyle,
                        headerLeft: () => {
                            return (
                                <BackButton />
                            )
                        }
                    }}
                />
            </Stack>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.bgPrimary,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5, 
        paddingRight: 10
    },

    text: {
        color: Colors.dark.txtPrimary,
        fontSize: 16,
        fontFamily: 'Manrope-Medium'
    }
});

export default _layout;

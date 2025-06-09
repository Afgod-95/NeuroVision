import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import React from 'react';
import { Colors } from '@/src/constants/Colors';
import Animated, {
    withSpring,
    useSharedValue,
    useAnimatedStyle,
    FadeInUp
} from 'react-native-reanimated';

interface ButtonProps {
    title: string,
    width?: number,
    onPress: () => void,
    disabled?: boolean,
    loading?: boolean,
}

const Button = ({ onPress, title, disabled, loading, width }: ButtonProps) => {
    const scale = useSharedValue(1);

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
            entering={FadeInUp.duration(600).delay(180).springify()} 
            style={{ width: width ?? '100%' }}
        >
            <Animated.View style={[animatedStyle, { width: '100%' }]}> 
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={disabled || loading}
                    style={{
                        backgroundColor: disabled ? Colors.dark.txtSecondary : Colors.dark.button,
                        height: 45,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 15,
                        paddingVertical: 10,
                        width: '100%',
                        borderRadius: 10,
                    }}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.dark.txtPrimary} />
                    ) : (
                        <Text style={{ color: disabled ? '#000' : '#fff', fontSize: 16 }}>{title}</Text>
                    )}
                </Pressable>
            </Animated.View>
        </Animated.View>

    );
};

export default Button;

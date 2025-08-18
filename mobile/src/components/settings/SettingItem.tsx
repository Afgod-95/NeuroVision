import React from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/src/constants/Colors';

const HEADER_HEIGHT = 60;

interface SettingItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    children?: React.ReactNode;
    danger?: boolean;
    isPremium?: boolean;
}
const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    children,
    danger = false,
    isPremium = false
}) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress && !children}
    >
        <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, isPremium && styles.premiumIcon]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={danger ? '#FF4444' : isPremium ? '#FFD700' : Colors.dark.txtPrimary}
                />
            </View>
            <View style={styles.settingText}>
                <Text style={[styles.settingTitle, danger && styles.dangerText]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={styles.settingSubtitle}>{subtitle}</Text>
                )}
            </View>
        </View>
        <View style={styles.settingRight}>
            {children}
            {showArrow && !children && (
                <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.dark.txtSecondary}
                />
            )}
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#1C1C1E',
        marginBottom: 5,
        minHeight: 56,
        borderRadius: 15,
    },
    settingLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    premiumIcon: {
        backgroundColor: '#FFD70020',
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '400',
        color: Colors.dark.txtPrimary,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: 'gray',
    },
    dangerText: {
        color: '#FF4444',
    },
    separator: {
        height: 24,
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    versionText: {
        fontSize: 14,
        color: Colors.dark.txtSecondary,
        fontWeight: '500',
    },
    versionSubtext: {
        fontSize: 12,
        color: Colors.dark.txtSecondary,
        marginTop: 2,
        opacity: 0.7,
    },
});

export default SettingItem
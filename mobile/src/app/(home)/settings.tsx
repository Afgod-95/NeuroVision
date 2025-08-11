import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/Colors';
import SettingItem from '@/src/components/settings/SettingItem';
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/src/redux/store';

import {  logoutUser, resetState } from '@/src/redux/slices/authSlice';

const BASE_HEADER_HEIGHT = 30;

interface SettingItemData {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    children?: React.ReactNode;
    danger?: boolean;
    isPremium?: boolean;
}

interface SettingSection {
    title?: string;
    items: SettingItemData[];
}

interface SectionHeaderProps {
    title: string;
}

const SettingsScreen: React.FC = () => {
    const scrollY = useSharedValue(0);
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch<AppDispatch>();
    const { user: userCredentials } = useSelector((state: RootState) => state.user);

    // Settings state
    const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
    const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);
    const [soundEffects, setSoundEffects] = useState<boolean>(false);
    const [autoSave, setAutoSave] = useState<boolean>(true);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const { useDeleteUserAccountMutation } = useAuthMutation()
    const deleteUserAccount = useDeleteUserAccountMutation();

    //platform compatibility
    const isAndroid = Platform.OS === 'android';
    const isIos = Platform.OS === 'ios';

    const headerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolate(
        scrollY.value,
        [0, 80],
        [0, 1],
        Extrapolate.CLAMP
    );

    const shadowOpacity = interpolate(
        scrollY.value,
        [0, 80],
        [0, 0.2],
        Extrapolate.CLAMP
    );

    const borderBottomWidth = interpolate(
        scrollY.value,
        [0, 1],
        [0, StyleSheet.hairlineWidth],
        Extrapolate.CLAMP
    );

    return {
        backgroundColor: `rgba(18,18,18,${backgroundColor})`,
        shadowOpacity,
        borderBottomWidth,
        borderBottomColor: Colors.dark.borderColor,
    };
});


    const handleUpgrade = (): void => {
        Alert.alert('Upgrade to Plus', 'Get access to NeuroVision-4, faster responses, and priority access to new features.');
    };

    const handleDataExport = (): void => {
        Alert.alert('Export Data', 'Your conversation history will be prepared for download.');
    };

    const handleDeleteAccount = (): void => {
        Alert.alert(
            'Delete Account',
            'This action cannot be undone. All your data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive',
                    onPress: () => {
                        if (userCredentials?.id !== undefined) {
                            deleteUserAccount.mutate({ id: userCredentials.id });
                            dispatch(resetState());
                        } else {
                            Alert.alert('Error', 'User ID is missing.');
                        }
                    }
                },
              

            ]
        );
    };

    // Settings sections configuration
    const settingSections: SettingSection[] = [
        {
            // Account Section (no title)
            items: [
                {
                    icon: 'person-circle',
                    title: 'Account',
                    subtitle: userCredentials?.email,
                    onPress: () => { },
                },
                {
                    icon: 'diamond',
                    title: 'Upgrade to Plus',
                    subtitle: 'Get NeuroVision-4, faster responses, and more',
                    onPress: handleUpgrade,
                    isPremium: true,
                },
            ],
        },
        {
            title: 'Preferences',
            items: [
                {
                    icon: 'chatbubbles',
                    title: 'Chat History & Training',
                    subtitle: 'Manage your conversations',
                    onPress: () => { },
                },
                {
                    icon: 'download',
                    title: 'Export Data',
                    subtitle: 'Download your conversations',
                    onPress: handleDataExport,
                },
                {
                    icon: 'moon',
                    title: 'Theme',
                    subtitle: 'Dark',
                    onPress: () => { },
                },
                {
                    icon: 'language',
                    title: 'Language',
                    subtitle: 'English',
                    onPress: () => { },
                },
            ],
        },
        {
            title: 'Audio & Accessibility',
            items: [
                {
                    icon: 'volume-high',
                    title: 'Speech',
                    subtitle: 'Read responses aloud',
                    showArrow: false,
                    children: (
                        <Switch
                            value={speechEnabled}
                            onValueChange={setSpeechEnabled}
                            trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'phone-portrait',
                    title: 'Haptic Feedback',
                    showArrow: false,
                    children: (
                        <Switch
                            value={hapticFeedback}
                            onValueChange={setHapticFeedback}
                            trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'musical-notes',
                    title: 'Sound Effects',
                    showArrow: false,
                    children: (
                        <Switch
                            value={soundEffects}
                            onValueChange={setSoundEffects}
                            trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
            ],
        },
        {
            title: 'Privacy & Data',
            items: [
                {
                    icon: 'shield-checkmark',
                    title: 'Privacy Policy',
                    onPress: () => {router.push('/(home)/settings/privacy')},
                },
                {
                    icon: 'document-text',
                    title: 'Terms of Service',
                    onPress: () => {router.push('/(home)/settings/terms')},
                },
                {
                    icon: 'save',
                    title: 'Auto-save Conversations',
                    showArrow: false,
                    children: (
                        <Switch
                            value={autoSave}
                            onValueChange={setAutoSave}
                            trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'trash',
                    title: 'Clear All Conversations',
                    onPress: () => { },
                    danger: true,
                },
            ],
        },
        {
            title: 'Support',
            items: [
                {
                    icon: 'help-circle',
                    title: 'Help & FAQ',
                    onPress: () => {router.push('/(home)/settings/help')},
                },
                {
                    icon: 'mail',
                    title: 'Contact Support',
                    onPress: () => {router.push('/(home)/settings/support')},
                },
                {
                    icon: 'star',
                    title: 'Rate App',
                    onPress: () => { },
                },
            ],
        },
        {
            // Account Actions (no title)
            items: [
                {
                    icon: 'log-out',
                    title: 'Sign Out',
                    onPress: () => { 
                       dispatch(logoutUser());
                        router.push('/(auth)')
                    },
                    danger: true,
                },
                {
                    icon: 'person-remove',
                    title: 'Delete Account',
                    onPress: handleDeleteAccount,
                    danger: true,
                },
            ],
        },
    ];



    const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const Separator: React.FC = () => <View style={styles.separator} />;

    const renderSection = (section: SettingSection, index: number) => (
        <React.Fragment key={index}>
            <View style={styles.section}>
                {section.title && <SectionHeader title={section.title} />}
                {section.items.map((item, itemIndex) => (
                    <SettingItem
                        key={`${index}-${itemIndex}`}
                        icon={item.icon}
                        title={item.title}
                        subtitle={item.subtitle}
                        onPress={item.onPress}
                        showArrow={item.showArrow}
                        danger={item.danger}
                        isPremium={item.isPremium}
                    >
                        {item.children}
                    </SettingItem>
                ))}
            </View>
            {index < settingSections.length - 1 && <Separator />}
        </React.Fragment>
    );

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.header,
                    {
                       
                        height: BASE_HEADER_HEIGHT + insets.top,
                    },
                    headerAnimatedStyle,
                ]}
            >
                <View />
                <Text style={styles.headerTitle}>Settings</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={Colors.dark.txtPrimary} />
                </TouchableOpacity>
            </Animated.View>


            <Animated.ScrollView
                contentContainerStyle={{
                    paddingTop: BASE_HEADER_HEIGHT + insets.top + 20,
                    paddingBottom: insets.bottom + 20,
                }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {settingSections.map(renderSection)}

                {/* Version Info */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Version 1.2025.01</Text>
                    <Text style={styles.versionSubtext}>NeuroVision for {isIos ? 'iOS' : isAndroid ? 'Android' : "Web"}</Text>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', 
    },


    headerTitle: {
        color: Colors.dark.txtPrimary,
        fontWeight: '600',
        fontSize: 18,
    },

    closeButton: {

        padding: 4,
        height: BASE_HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },


    section: {
        marginHorizontal: 16,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.dark.txtSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginTop: 8,
        marginLeft: 4,
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

export default SettingsScreen;
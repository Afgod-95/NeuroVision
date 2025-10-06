import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/Colors';
import SettingItem from '@/src/components/settings/SettingItem';
import { useAuthMutation } from '@/src/hooks/auth/useAuthMutation';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/src/redux/store';
import { logoutUser, resetState, setUseBiometrics } from '@/src/redux/slices/authSlice';
import * as Haptics from 'expo-haptics';
import { setEnableHepticFeedback } from '@/src/redux/slices/hepticFeedbackSlice';
import AccountDeletionSheet from '@/src/components/settings/AccountDeletion';
import BottomSheet from '@gorhom/bottom-sheet';
import { useCustomAlert } from '@/src/components/alert/CustomAlert';
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
    const { user: userCredentials, useBiometrics } = useSelector((state: RootState) => state.auth);
    const { enableHepticFeedback } = useSelector((state: RootState) => state.hepticFeedback);
    // Essential AI app settings
    const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
    const [autoSave, setAutoSave] = useState<boolean>(true);
    const [dataSharing, setDataSharing] = useState<boolean>(false);
    const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

    const [openAccountDeletion, setOpenAccountDeletion] = useState<boolean>(false);
    const openAccountDeletionRef = useRef<BottomSheet>(null);

    const { AlertComponent, showSuccess, showInfo, showWarning } = useCustomAlert()

    //open account deletion modal 
    const handleOpenAccountDeletion = () => {
        setOpenAccountDeletion(true);
        openAccountDeletionRef.current?.expand();
    }

    //function to toggle use biometrics 
    const toggleUseBiometric = () => {
        dispatch(setUseBiometrics(!useBiometrics));
    }

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    //delete user account
    const { useDeleteUserAccountMutation } = useAuthMutation();
    const deleteUserAccount = useDeleteUserAccountMutation();
    const handleDeleteAccount = useCallback(() => {
        deleteUserAccount.mutate({
            userId: userCredentials?.id as number
        })
        dispatch(resetState());
        showSuccess(`Success`, 'You have successfully deleted your account.');
        
        setTimeout(() => {
            router.push('/(auth)/login')
        }, 2000)
    }, [deleteUserAccount, dispatch, userCredentials?.id, showSuccess])

    // Fixed logout handler using custom alert
    const handleLogout = useCallback(() => {
        showInfo(
            'Sign Out',
            'Are you sure you want to sign out?',
            {
                primaryButtonText: 'Sign Out',
                secondaryButtonText: 'Cancel',
                showCloseButton: false,
                onPrimaryPress: () => {
                    setIsLoggingOut(true);

                    // Navigate immediately to prevent flashing
                    router.replace('/(auth)/login');

                    // Then dispatch logout action
                    setTimeout(() => {
                        dispatch(logoutUser());
                        showSuccess('Success', "You have successfully logged out", {
                            autoClose: true
                        });
                        setIsLoggingOut(false);
                    }, 100);
                },
                onSecondaryPress: () => {
                    // Just close the alert, no action needed
                }
            }
        );
    }, [dispatch, showSuccess, showInfo]);

    const isIos = Platform.OS === 'ios';
    const isAndroid = Platform.OS === 'android';

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolate(
            scrollY.value,
            [0, 80],
            [0, 1],
            Extrapolation.CLAMP
        );

        const shadowOpacity = interpolate(
            scrollY.value,
            [0, 80],
            [0, 0.2],
            Extrapolation.CLAMP
        );

        const borderBottomWidth = interpolate(
            scrollY.value,
            [0, 1],
            [0, StyleSheet.hairlineWidth],
            Extrapolation.CLAMP
        );

        return {
            backgroundColor: Colors.dark.bgPrimary,
            shadowOpacity,
            borderBottomWidth,
            borderBottomColor: Colors.dark.borderColor,
        };
    });

    const handleToggleHepticFeedback = () => {
        const newValue = !enableHepticFeedback;
        dispatch(setEnableHepticFeedback(newValue));

        if (newValue) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleUpgrade = (): void => {
        Alert.alert('Upgrade to Pro', 'Unlock advanced AI features, unlimited conversations, and priority support.');
    };

    const handleClearHistory = useCallback(() => {
        showWarning('Final Confirmation', 'Are you absolutely sure? This action cannot be undone.', {
            primaryButtonText: 'Delete',
            onPrimaryPress: () => {
                
            },
            secondaryButtonText: 'Cancel',
            onSecondaryPress: () => {
              
            }
        })
    }, [dispatch, showSuccess, showInfo]);

    // Streamlined settings sections - only essentials
    const settingSections: SettingSection[] = [
        {
            title: 'Account',
            items: [
                {
                    icon: 'person-circle',
                    title: "Name",
                    children: (
                        <Text style={{ color: "gray", fontSize: 14 }}>{userCredentials?.username}</Text>
                    ),
                    showArrow: false,
                    danger: false,
                },
                {
                    icon: 'mail',
                    title: "Email",
                    children: (
                        <Text style={{ color: "gray", fontSize: 14 }}>{userCredentials?.email}</Text>
                    ),
                    showArrow: false,
                    danger: false,
                },
                {
                    icon: 'add',
                    title: 'Subscription',
                    children: (
                        <Text style={{ color: "gray", fontSize: 14 }}>Free Plan</Text>
                    ),
                    isPremium: false,
                    danger: false,
                },
                {
                    icon: 'lock-closed',
                    title: 'Password',
                    subtitle: 'Change your password',
                    showArrow: true,
                },
            ],
        },
        {
            // subscription
            title: 'Subscription',
            items: [
                {
                    icon: 'diamond',
                    title: 'Upgrade to Neurovision Plus',
                    onPress: () => {

                    },
                    isPremium: true,
                    danger: false,
                },
            ],
        },
        {
            title: 'App & Preferences',
            items: [
                {
                    icon: 'finger-print',
                    title: 'Biometric Authentication',
                    subtitle: 'Use Face ID or Touch ID to sign in',
                    showArrow: false,
                    children: (
                        <Switch
                            value={useBiometrics}
                            onValueChange={toggleUseBiometric}
                            trackColor={{ false: '#3A3A3C', true: 'lemon' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'notifications',
                    title: 'Push Notifications',
                    subtitle: 'Get notified about updates',
                    showArrow: false,
                    children: (
                        <Switch
                            value={autoSave}
                            onValueChange={setAutoSave}
                            trackColor={{ false: '#3A3A3C', true: 'lemon' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'phone-portrait',
                    title: 'Haptic Feedback',
                    subtitle: 'Vibration for interactions',
                    showArrow: false,
                    children: (
                        <Switch
                            value={enableHepticFeedback}
                            onValueChange={handleToggleHepticFeedback}
                            trackColor={{ false: '#3A3A3C', true: 'lemon' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'volume-high',
                    title: 'Voice Responses',
                    subtitle: 'Read AI responses aloud',
                    showArrow: false,
                    children: (
                        <Switch
                            value={speechEnabled}
                            onValueChange={setSpeechEnabled}
                            trackColor={{ false: '#3A3A3C', true: 'lemon' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'save',
                    title: 'Auto-save Conversations',
                    subtitle: 'Automatically save chat history',
                    showArrow: false,
                    children: (
                        <Switch
                            value={autoSave}
                            onValueChange={setAutoSave}
                            trackColor={{ false: '#3A3A3C', true: 'lemon' }}
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
                    icon: 'analytics',
                    title: 'Improve AI Responses',
                    subtitle: 'Share conversations to enhance AI quality',
                    showArrow: false,
                    children: (
                        <Switch
                            value={dataSharing}
                            onValueChange={setDataSharing}
                            trackColor={{ false: '#3A3A3C', true: 'lemon' }}
                            thumbColor="#FFFFFF"
                        />
                    ),
                },
                {
                    icon: 'shield-checkmark',
                    title: 'Privacy Policy',
                    onPress: () => { router.push('/(home)/settings/privacy') },
                },
                {
                    icon: 'trash',
                    title: 'Clear All Conversations',
                    subtitle: 'Delete chat history permanently',
                    onPress: handleClearHistory,
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
                    onPress: () => { router.push('/(home)/settings/help') },
                },
                {
                    icon: 'mail',
                    title: 'Contact Support',
                    onPress: () => { router.push('/(home)/settings/support') },
                },
            ],
        },
        {
            // Account Actions
            items: [
                {
                    icon: 'person-remove',
                    title: 'Delete Account',
                    onPress: handleOpenAccountDeletion,
                    danger: true,
                },
                {
                    icon: 'log-out',
                    title: isLoggingOut ? 'Signing Out...' : 'Sign Out',
                    onPress: handleLogout,
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
        <>
            <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.bgPrimary }}>
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
                        <TouchableOpacity onPress={() => router.dismiss()} style={styles.closeButton}>
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
            </SafeAreaView>
            <AlertComponent />
            {/* open bottom sheet */}
            {openAccountDeletion && (
                <AccountDeletionSheet
                    isLoading={deleteUserAccount.isPending}
                    bottomSheetRef={openAccountDeletionRef}
                    onDelete={() => { handleDeleteAccount() }}
                    onCancel={() => { openAccountDeletionRef.current?.close() }}
                    userName={userCredentials?.username}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.bgPrimary,
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

    profileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD70020',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#FFD70040',
    },
    profileBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFD700',
        marginLeft: 4,
    },
    versionSubtext: {
        fontSize: 12,
        color: Colors.dark.txtSecondary,
        marginTop: 2,
        opacity: 0.7,
    },
});

export default SettingsScreen;
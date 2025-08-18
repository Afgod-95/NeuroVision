import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolateColor,
    FadeInDown,
    FadeOutUp,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';

const BASE_HEADER_HEIGHT = 30;

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

const AccountScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { user: userCredentials } = useSelector((state: RootState) => state.auth);
    
    const [name, setName] = useState(userCredentials?.username || '');
    const [email, setEmail] = useState(userCredentials?.email || '');
    const [isEditing, setIsEditing] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [biometrics, setBiometrics] = useState(false);
    
    // Animation values
    const editModeProgress = useSharedValue(0);
    const profileImageScale = useSharedValue(1);

    const handleSaveChanges = () => {
        Alert.alert('Success', 'Profile updated successfully.', [
            {
                text: 'OK',
                onPress: () => {
                    setIsEditing(false);
                    editModeProgress.value = withSpring(0);
                }
            }
        ]);
    };

    const handleChangePassword = () => {
        Alert.alert(
            'Change Password',
            'A password reset link will be sent to your email.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Send Link', style: 'default' }
            ]
        );
    };

    const handleUpgrade = () => {
        Alert.alert(
            'Upgrade to Pro',
            'Get unlimited conversations, advanced AI features, and priority support.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', style: 'default' }
            ]
        );
    };

    const toggleEditMode = () => {
        setIsEditing(!isEditing);
        editModeProgress.value = withSpring(isEditing ? 0 : 1, {
            damping: 15,
            stiffness: 150,
        });
    };

    const handleProfileImagePress = () => {
        profileImageScale.value = withSpring(0.95, { damping: 10, stiffness: 200 }, () => {
            profileImageScale.value = withSpring(1);
        });
        
        Alert.alert(
            'Change Profile Photo',
            'Choose your photo source',
            [
                { text: 'Camera', onPress: () => {} },
                { text: 'Photo Library', onPress: () => {} },
                { text: 'Remove Photo', style: 'destructive', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    // Animated styles
    const editButtonStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            editModeProgress.value,
            [0, 1],
            ['transparent', '#FF3B30']
        );
        
        return {
            backgroundColor,
            transform: [{ scale: withSpring(editModeProgress.value > 0 ? 1.05 : 1) }],
        };
    });

    const profileImageAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: profileImageScale.value }],
    }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.bgPrimary }}>
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { height: BASE_HEADER_HEIGHT + insets.top + 20 }]}>
                    <View style={styles.headerGradient} />
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <View style={styles.headerIconContainer}>
                                <Ionicons name="chevron-back" size={22} color={Colors.dark.txtPrimary} />
                            </View>
                        </TouchableOpacity>
                        
                        <Text style={styles.headerTitle}>Account</Text>
                        
                        <Animated.View style={[styles.editButton, editButtonStyle]}>
                            <TouchableOpacity onPress={toggleEditMode} style={styles.editButtonTouchable}>
                                <Text style={[styles.editButtonText, isEditing && styles.editButtonTextActive]}>
                                    {isEditing ? 'Cancel' : 'Edit'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={{
                        paddingTop: BASE_HEADER_HEIGHT + insets.top + 40,
                        paddingBottom: insets.bottom + 30,
                        paddingHorizontal: 16,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <Animated.View style={[styles.profileImageContainer, profileImageAnimatedStyle]}>
                            <TouchableOpacity onPress={handleProfileImagePress} style={styles.profileImageTouchable}>
                                <View style={styles.profileImageGradient}>
                                    <View style={styles.profileImage}>
                                        <Ionicons name="person" size={45} color={Colors.dark.txtSecondary} />
                                    </View>
                                    <View style={styles.profileImageOverlay}>
                                        <Ionicons name="camera" size={16} color="#FFFFFF" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                        
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{name || 'Add your name'}</Text>
                            <Text style={styles.profileEmail}>{email || 'Add your email'}</Text>
                            <View style={styles.profileBadge}>
                                <Ionicons name="diamond" size={12} color="#FFD700" />
                                <Text style={styles.profileBadgeText}>Free Plan</Text>
                            </View>
                        </View>
                    </View>

                    {/* Edit Profile or Subscription */}
                    {isEditing ? (
                        <Animated.View entering={FadeInDown}>
                            <Text style={styles.sectionTitle}>Edit Profile</Text>
                            
                            <View style={styles.editInputContainer}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={Colors.dark.txtSecondary + '80'}
                                />
                            </View>
                            
                            <View style={styles.editInputContainer}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email address"
                                    placeholderTextColor={Colors.dark.txtSecondary + '80'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            
                            <Animated.View entering={FadeInDown}>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                    ) : (
                        <>

                            {/* Essential Settings */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Settings</Text>
                                
                                <SettingItem
                                    icon="notifications"
                                    title="Push Notifications"
                                    subtitle="Get notified about updates"
                                    showArrow={false}
                                >
                                    <Switch
                                        value={notifications}
                                        onValueChange={setNotifications}
                                        trackColor={{ false: '#3e3e3e', true: '#007AFF' }}
                                        thumbColor="#FFFFFF"
                                    />
                                </SettingItem>

                                <SettingItem
                            icon="finger-print"
                            title="Biometric Authentication"
                            subtitle="Use Face ID or Touch ID to sign in"
                            showArrow={false}
                        >
                            <Switch
                                value={biometrics}
                                onValueChange={setBiometrics}
                                trackColor={{ false: '#3e3e3e', true: '#007AFF' }}
                                thumbColor="#FFFFFF"
                            />
                        </SettingItem>
                                
                                <SettingItem
                                    icon="lock-closed"
                                    title="Change Password"
                                    subtitle="Update your account password"
                                    onPress={handleChangePassword}
                                />
                            </View>
                        </>
                    )}

                    {/* Account Info */}
                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>Member Since January 2025</Text>
                        <Text style={styles.versionSubtext}>Account ID: {userCredentials?.id || 'USER_12345'}</Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
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
        overflow: 'hidden',
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.dark.bgPrimary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.borderColor + '30',
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    headerTitle: {
        color: Colors.dark.txtPrimary,
        fontWeight: '700',
        fontSize: 20,
        letterSpacing: 0.5,
    },
    backButton: {
        padding: 4,
    },
    headerIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.dark.bgSecondary + '60',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#007AFF40',
    },
    editButtonTouchable: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButtonText: {
        color: '#007AFF',
        fontSize: 15,
        fontWeight: '600',
    },
    editButtonTextActive: {
        color: '#FFFFFF',
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 20,
    },
    profileImageContainer: {
        marginBottom: 20,
    },
    profileImageTouchable: {
        position: 'relative',
    },
    profileImageGradient: {
        position: 'relative',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.dark.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#007AFF20',
    },
    profileImageOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.dark.bgPrimary,
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.dark.txtPrimary,
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 15,
        color: Colors.dark.txtSecondary,
        marginBottom: 12,
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
    sectionContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.dark.txtPrimary,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
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
        backgroundColor: '#FFD700',
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
        fontSize: 14,
        color: Colors.dark.txtSecondary,
    },
    dangerText: {
        color: '#FF4444',
    },
    editInputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.dark.txtSecondary,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    editInput: {
        backgroundColor: '#1C1C1E',
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        color: Colors.dark.txtPrimary,
        borderWidth: 1,
        borderColor: '#007AFF40',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 15,
        paddingVertical: 16,
        marginTop: 8,
        gap: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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

export default AccountScreen;
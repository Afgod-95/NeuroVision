import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    Dimensions,
    FlatList,
    ListRenderItem,
    Animated,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Colors } from '@/src/constants/Colors';
import { ConversationSummary } from '@/src/utils/interfaces/TypescriptInterfaces';
import { router } from 'expo-router';
import { useDebounce } from 'use-debounce';
import { MotiView } from 'moti';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';

const { width, height } = Dimensions.get('window');

type ModalAction = {
    id: string;
    label: string;
    icon: string;
    onPress: (messageId: string) => void;
};

type GroupedMessage = {
    type: 'header' | 'message';
    id: string;
    title?: string;
    message?: ConversationSummary;
};

type RecentMessagesProps = {
    messages: ConversationSummary[];
    search?: string;
    isLoading: boolean;
    isFetching: boolean;
    activeConversationId?: string;
    onShareChat?: (messageId: string) => void;
    onRenameChat?: (messageId: string) => void;
    onArchiveChat?: (messageId: string) => void;
    onDeleteChat?: (messageId: string) => void;
    onMessagePress?: (messageId: string) => void;
};

// Shimmer Component
const ShimmerPlaceholder: React.FC<{ width: number; height: number; style?: any }> = ({
    width,
    height,
    style
}) => {
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startShimmer = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnimation, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmerAnimation, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        startShimmer();
    }, [shimmerAnimation]);

    const opacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: Colors.dark.bgSecondary,
                    borderRadius: 4,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Shimmer Message Item Component
const ShimmerMessageItem: React.FC = () => {
    return (
        <View style={styles.messageItemContainer}>
            <View style={styles.messageItem}>
                <View style={styles.messageContent}>
                    <View style={styles.messageTextContainer}>
                        <ShimmerPlaceholder width={180} height={16} />
                    </View>
                    <View style={styles.messageActions}>
                        <ShimmerPlaceholder width={28} height={28} style={{ borderRadius: 14 }} />
                    </View>
                </View>
            </View>
        </View>
    );
};

// Shimmer Loading Component
const ShimmerLoading: React.FC = () => {
    const shimmerItems = [
        { id: 'header', type: 'header' },
        { id: 'message-1', type: 'message' },
        { id: 'message-2', type: 'message' },
        { id: 'message-3', type: 'message' },
        { id: 'message-4', type: 'message' },
        { id: 'message-5', type: 'message' },
        { id: 'message-6', type: 'message' },
        { id: 'message-7', type: 'message' },
        { id: 'message-8', type: 'message' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.listContainer}>
                {shimmerItems.map((item) => (
                    <View key={item.id}>
                        <ShimmerMessageItem />
                    </View>
                ))}
            </View>
        </View>
    );
};

const RecentMessages: React.FC<RecentMessagesProps> = ({
    messages = [],
    search = '',
    isLoading,
    isFetching,
    activeConversationId,
    onShareChat,
    onRenameChat,
    onArchiveChat,
    onDeleteChat,
    onMessagePress,
}) => {
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [pressedMessage, setPressedMessage] = useState<string | null>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['40%'], []);

    const [debouncedSearch] = useDebounce(search, 500);

    // Modal actions
    const modalActions: ModalAction[] = [
        {
            id: 'share',
            label: 'Share Chat',
            icon: 'share-2',
            onPress: (id) => {
                onShareChat?.(id);
                handleCloseBottomSheet();
            },
        },
        {
            id: 'rename',
            label: 'Rename',
            icon: 'edit-2',
            onPress: (id) => {
                onRenameChat?.(id);
                handleCloseBottomSheet();
            },
        },
        {
            id: 'archive',
            label: 'Archive',
            icon: 'archive',
            onPress: (id) => {
                onArchiveChat?.(id);
                handleCloseBottomSheet();
            },
        },
        {
            id: 'delete',
            label: 'Delete',
            icon: 'trash-2',
            onPress: (id) => {
                onDeleteChat?.(id);
                handleCloseBottomSheet();
            },
        },
    ];

    const groupedMessages = useMemo(() => {
        if (messages.length === 0) return [];

        const filteredMessages = (debouncedSearch
            ? messages.filter(message =>
                message.title.toLowerCase().includes(debouncedSearch.toLowerCase())
            )
            : messages
        ).map(message => ({
            ...message,
            title: message.title.charAt(0).toUpperCase() + message.title.slice(1)
        }));

        const sortedMessages = [...filteredMessages].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.updated_at).getTime()
        );

        const grouped: GroupedMessage[] = [];

        sortedMessages.forEach((message) => {
            grouped.push({
                type: 'message',
                id: message.conversation_id,
                message,
            });
        });

        return grouped;
    }, [messages, debouncedSearch]);

    const handleMessagePress = (messageId: string) => {
        setPressedMessage(messageId);

        onMessagePress?.(messageId);
        router.push({
            pathname: `/(home)`,
            params: { conversation_id: messageId },
        });

        setTimeout(() => {
            setPressedMessage(null);
        }, 150);
    };

    const handleLongPress = (messageId: string) => {
        setSelectedMessage(messageId);
        bottomSheetRef.current?.expand();
    };

    const handleCloseBottomSheet = useCallback(() => {
        bottomSheetRef.current?.close();
        setTimeout(() => {
            setSelectedMessage(null);
        }, 300);
    }, []);

    const renderBackdrop = useCallback(
        (props: BottomSheetDefaultBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    const renderItem: ListRenderItem<GroupedMessage> = ({ item }) => {
        const message = item.message!;
        const isPressed = pressedMessage === message.conversation_id;
        const isActive = activeConversationId === message.conversation_id;

        return (
            <View style={styles.messageItemContainer}>
                <TouchableOpacity
                    style={[
                        styles.messageItem,
                        isActive && styles.messageItemActive,
                        isPressed && styles.messageItemPressed
                    ]}
                    onPress={() => handleMessagePress(message.conversation_id)}
                    onLongPress={() => handleLongPress(message.conversation_id)}
                    delayLongPress={500}
                >
                    {isActive && <View style={styles.activeIndicator} />}

                    <View style={styles.messageContent}>
                        <View style={styles.messageTextContainer}>
                            <Text
                                style={[
                                    styles.messageText,
                                    isActive && styles.messageTextActive
                                ]}
                                numberOfLines={1}
                            >
                                {message.title}
                            </Text>
                        </View>
                        <View style={styles.messageActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleLongPress(message.conversation_id)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather
                                    name="more-horizontal"
                                    size={16}
                                    color={isActive ? Colors.dark.txtPrimary : "#6b7280"}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEmptyState = () => (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            style={styles.emptyState}
        >
            <View style={styles.emptyStateIcon}>
                <Feather name="message-circle" size={48} color="#374151" />
            </View>
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtext}>
                Start chatting to see your conversation history here
            </Text>
        </MotiView>
    );

    const renderEmptySearchState = () => (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            style={styles.emptyState}
        >
            <View style={styles.emptyStateIcon}>
                <Feather name="message-circle" size={48} color="#374151" />
            </View>
            <Text style={styles.emptyStateText}>No results found</Text>
            <Text style={styles.emptyStateSubtext}>
                We couldn&apos;t find any matches for your search. Try adjusting your keywords or check for typos.
            </Text>
        </MotiView>
    );

    const renderUIState = useMemo(() => {
        if (debouncedSearch && groupedMessages.length === 0) {
            return renderEmptySearchState();
        }
        return renderEmptyState();
    }, [debouncedSearch, groupedMessages]);

    const keyExtractor = (item: GroupedMessage) => item.id;

    const getItemLayout = (data: ArrayLike<GroupedMessage> | null | undefined, index: number) => {
        if (!data) return { length: 0, offset: 0, index };

        const item = data[index];
        const height = item.type === 'header' ? 44 : 52;

        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += data[i].type === 'header' ? 44 : 52;
        }

        return { length: height, offset, index };
    };

    if (isLoading) {
        return <ShimmerLoading />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={groupedMessages}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderUIState}
                contentContainerStyle={groupedMessages.length === 0 ? styles.emptyListContainer : styles.listContainer}
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={getItemLayout}
            />

            {/* BottomSheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.bottomSheetIndicator}
                style={styles.bottomSheetContainer}
                containerStyle={styles.bottomSheetWrapper}
                onChange={(index) => {
                    if (index === -1) {
                        setSelectedMessage(null);
                    }
                }}
            >
                <BottomSheetView style={styles.bottomSheetContent}>
                    <Text style={styles.bottomSheetTitle}>Actions</Text>

                    {modalActions.map((action, index) => (
                        <Pressable
                            key={action.id}
                            style={({ pressed }) => [
                                styles.modalAction,
                                pressed && styles.modalActionPressed,
                                action.id === 'delete' && index === modalActions.length - 1 && styles.deleteAction,
                            ]}
                            onPress={() => selectedMessage && action.onPress(selectedMessage)}
                        >
                            <View style={styles.modalActionContent}>
                                <View style={[
                                    styles.iconContainer,
                                    action.id === 'delete' && styles.deleteIconContainer
                                ]}>
                                    <Feather
                                        name={action.icon as any}
                                        size={20}
                                        color={action.id === 'delete' ? '#ef4444' : Colors.dark.txtPrimary}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.modalActionText,
                                        action.id === 'delete' && styles.deleteActionText,
                                    ]}
                                >
                                    {action.label}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </BottomSheetView>
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    listContainer: {
        paddingTop: 8,
    },
    messageItemContainer: {
        paddingHorizontal: 12,
        marginBottom: 2,
    },
    messageItem: {
        borderRadius: 8,
        backgroundColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
    },
    messageItemActive: {
        backgroundColor: Colors.dark.bgSecondary || '#1a1a1a',
        borderWidth: 1,
        borderColor: Colors.dark.borderColor || '#2a2a2a',
    },
    messageItemPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: Colors.dark.button,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    messageContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        minHeight: 48,
    },
    messageTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    messageText: {
        color: Colors.dark.txtSecondary,
        fontSize: 14,
        fontFamily: 'Manrope-Medium',
        lineHeight: 20,
    },
    messageTextActive: {
        color: Colors.dark.txtPrimary,
        fontFamily: 'Manrope-SemiBold',
    },
    messageActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyStateIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.dark.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyStateText: {
        color: Colors.dark.txtPrimary,
        fontSize: 18,
        fontFamily: 'Manrope-SemiBold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        color: Colors.dark.txtSecondary,
        fontSize: 14,
        fontFamily: 'Manrope-Regular',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
    emptyListContainer: {
        flex: 1,
    },
    bottomSheetWrapper: {
        zIndex: 9999,
    },
    bottomSheetContainer: {
        marginHorizontal: 0,
        borderRadius: 0,
    },
    bottomSheetBackground: {
        backgroundColor: Colors.dark.bgPrimary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    bottomSheetIndicator: {
        backgroundColor: Colors.dark.borderColor,
        width: 40,
        height: 4,
    },
    bottomSheetContent: {
        paddingHorizontal: 24,
        paddingBottom: 34,
        width: '100%',
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontFamily: 'Manrope-Bold',
        color: Colors.dark.txtPrimary,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    modalAction: {
        marginBottom: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalActionPressed: {
        backgroundColor: Colors.dark.bgSecondary,
    },
    modalActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.dark.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIconContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    modalActionText: {
        color: Colors.dark.txtPrimary,
        fontSize: 15,
        fontFamily: 'Manrope-SemiBold',
        flex: 1,
    },
    deleteAction: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.dark.borderColor,
        paddingTop: 12,
    },
    deleteActionText: {
        color: '#ef4444',
    },
});

export default RecentMessages;
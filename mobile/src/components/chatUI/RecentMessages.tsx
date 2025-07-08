import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StyleSheet,
    Dimensions,
    TouchableWithoutFeedback,
    FlatList,
    ListRenderItem,
    Animated,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Colors } from '@/src/constants/Colors';
import { ConversationSummary } from '@/src/utils/interfaces/TypescriptInterfaces';
import { router } from 'expo-router';

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
    isLoading: boolean,
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

// Shimmer Message Item Component - Fixed to match actual message structure
const ShimmerMessageItem: React.FC = () => {
    return (
        <View style={styles.messageItemContainer}>
            <View style={styles.messageItem}>
                <View style={styles.messageContent}>
                    <View style={styles.messageTextContainer}>
                        {/* Single line shimmer for title only, matching actual message */}
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

// Shimmer Header Component
const ShimmerHeader: React.FC = () => {
    return (
        <View style={styles.sectionHeader}>
            <ShimmerPlaceholder width={60} height={12} />
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
                        {item.type === 'header' ? (
                            <ShimmerHeader />
                        ) : (
                            <ShimmerMessageItem />
                        )}
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
    activeConversationId,
    onShareChat,
    onRenameChat,
    onArchiveChat,
    onDeleteChat,
    onMessagePress,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [pressedMessage, setPressedMessage] = useState<string | null>(null);

    // Modal actions
    const modalActions: ModalAction[] = [
        {
            id: 'share',
            label: 'Share Chat',
            icon: 'share-2',
            onPress: (id) => {
                onShareChat?.(id);
                setModalVisible(false);
            },
        },
        {
            id: 'rename',
            label: 'Rename',
            icon: 'edit-2',
            onPress: (id) => {
                onRenameChat?.(id);
                setModalVisible(false);
            },
        },
        {
            id: 'archive',
            label: 'Archive',
            icon: 'archive',
            onPress: (id) => {
                onArchiveChat?.(id);
                setModalVisible(false);
            },
        },
        {
            id: 'delete',
            label: 'Delete',
            icon: 'trash-2',
            onPress: (id) => {
                onDeleteChat?.(id);
                setModalVisible(false);
            },
        },
    ];

    const getDateLabel = (timestamp: Date): string => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());

        if (messageDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (messageDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            const diffInDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
            const diffInWeeks = Math.floor(diffInDays / 7);
            const diffInMonths = Math.floor(diffInDays / 30);

            if (diffInDays < 7) {
                return `${diffInDays} days ago`;
            } else if (diffInWeeks === 1) {
                return '1 week ago';
            } else if (diffInWeeks < 4) {
                return `${diffInWeeks} weeks ago`;
            } else if (diffInMonths === 1) {
                return '1 month ago';
            } else {
                return `${diffInMonths} months ago`;
            }
        }
    };

    const groupedMessages = useMemo(() => {
        if (messages.length === 0) return [];

        // Filter messages based on search if provided
        const filteredMessages = search
            ? messages.filter(message =>
                message.title.toLowerCase().includes(search.toLowerCase())
            )
            : messages;

        // Sort messages by timestamp (newest first)
        const sortedMessages = [...filteredMessages].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.updated_at).getTime()
        );

        const grouped: GroupedMessage[] = [];
        
        // Add single "Recents" header
        if (sortedMessages.length > 0) {
            grouped.push({
                type: 'header',
                id: 'header-recents',
                title: 'Recents',
            });
        }

        // Add all messages without date grouping
        sortedMessages.forEach((message) => {
            grouped.push({
                type: 'message',
                id: message.conversation_id,
                message,
            });
        });

        return grouped;
    }, [messages, search]);

    const handleMessagePress = (messageId: string) => {
        setPressedMessage(messageId);

        onMessagePress?.(messageId);
        router.push({
            pathname: `/(home)`,
            params: { conversation_id: messageId },
        })

        // Reset the pressed state after a short delay
        setTimeout(() => {
            setPressedMessage(null);
        }, 150);
    };

    const handleLongPress = (messageId: string) => {
        setSelectedMessage(messageId);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedMessage(null);
    };

    const renderItem: ListRenderItem<GroupedMessage> = ({ item }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{item.title}</Text>
                </View>
            );
        }

        const message = item.message!;
        const isPressed = pressedMessage === message.conversation_id;
        const isActive = activeConversationId === message.conversation_id;

        return (
            <View style={styles.messageItemContainer}>
                <Pressable
                    style={[
                        styles.messageItem,
                        (isPressed || isActive) && styles.messageItemActive
                    ]}
                    onPress={() => handleMessagePress(message.conversation_id)}
                    onLongPress={() => handleLongPress(message.conversation_id)}
                    delayLongPress={500}
                >
                    <View style={styles.messageContent}>
                        <View style={styles.messageTextContainer}>
                            <Text style={styles.messageText} numberOfLines={1}>
                                {message.title}
                            </Text>
                        </View>
                        <View style={styles.messageActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleLongPress(message.conversation_id)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="more-horizontal" size={16} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
                <Feather name="message-circle" size={48} color="#374151" />
            </View>
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtext}>
                Start chatting to see your conversation history here
            </Text>
        </View>
    );

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

    // Show shimmer loading when isLoading is true
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
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={groupedMessages.length === 0 ? styles.emptyListContainer : styles.listContainer}
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={getItemLayout}
            />

            {/* Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHandle} />
                                
                                {modalActions.map((action) => (
                                    <Pressable
                                        key={action.id}
                                        style={({ pressed }) => [
                                            styles.modalAction,
                                            pressed && styles.modalActionPressed,
                                            action.id === 'delete' && styles.deleteAction,
                                        ]}
                                        onPress={() => selectedMessage && action.onPress(selectedMessage)}
                                    >
                                        <View style={styles.modalActionContent}>
                                            <Feather
                                                name={action.icon as any}
                                                size={20}
                                                color={action.id === 'delete' ? '#ef4444' : Colors.dark.txtSecondary}
                                            />
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
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.borderColor,
        marginBottom: 4,
    },
    sectionHeaderText: {
        color: '#6b7280',
        fontSize: 12,
        fontFamily: 'Manrope-SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    messageItemContainer: {
        paddingHorizontal: 12,
        marginBottom: 2,
    },
    messageItem: {
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    messageItemActive: {
        backgroundColor: Colors.dark.bgSecondary,
        borderWidth: 1,
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
        color: Colors.dark.txtPrimary,
        fontSize: 14,
        fontFamily: 'Manrope-Medium',
        lineHeight: 20,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.dark.bgPrimary,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 34,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    modalHandle: {
        width: 36,
        height: 4,
        backgroundColor: Colors.dark.borderColor,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    modalAction: {
        marginHorizontal: 16,
        marginBottom: 4,
        borderRadius: 8,
    },
    modalActionPressed: {
        backgroundColor: Colors.dark.bgSecondary,
    },
    modalActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    modalActionText: {
        color: Colors.dark.txtPrimary,
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
    },
    deleteAction: {
        borderTopWidth: 1,
        borderTopColor: Colors.dark.borderColor,
        marginTop: 8,
        paddingTop: 8,
    },
    deleteActionText: {
        color: '#ef4444',
    },
});

export default RecentMessages;
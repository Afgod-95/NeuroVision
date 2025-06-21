import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Colors } from '@/src/constants/Colors';
import { ConversationSummary } from '@/src/utils/interfaces/TypescriptInterfaces';
import SkeletonMessage from './Skeleton';

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
    onShareChat?: (messageId: string) => void;
    onRenameChat?: (messageId: string) => void;
    onArchiveChat?: (messageId: string) => void;
    onDeleteChat?: (messageId: string) => void;
    onMessagePress?: (messageId: string) => void;
};

const RecentMessages: React.FC<RecentMessagesProps> = ({
    messages = [],
    search = '',
    isLoading,
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
        let currentGroup: string | null = null;

        sortedMessages.forEach((message) => {
            const dateLabel = getDateLabel(new Date(message.created_at));
            
            if (currentGroup !== dateLabel) {
                // Add header for new group
                grouped.push({
                    type: 'header',
                    id: `header-${dateLabel}`,
                    title: dateLabel,
                });
                currentGroup = dateLabel;
            }
            
            // Add message
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
        
        return (
            <Pressable
                style={[
                    styles.messageItem,
                    isPressed && styles.messageItemPressed
                ]}
                onPress={() => handleMessagePress(message.conversation_id)}
                onLongPress={() => handleLongPress(message.conversation_id)}
                delayLongPress={500}
            >
                <View style={[styles.messageContent]}>
                    <Text style={styles.messageText} numberOfLines={2}>
                        {message.title}
                    </Text>
                </View>
            </Pressable>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color="#4b5563" />
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>Start a conversation to see your recent chats</Text>
        </View>
    );

    const keyExtractor = (item: GroupedMessage) => item.id;

    const getItemLayout = (data: ArrayLike<GroupedMessage> | null | undefined, index: number) => {
        if (!data) return { length: 0, offset: 0, index };
        
        const item = data[index];
        const height = item.type === 'header' ? 50 : 72;
        
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += data[i].type === 'header' ? 50 : 72;
        }
        
        return { length: height, offset, index };
    };

    return (
        <View style={styles.container}>
            {isLoading ? 
                groupedMessages.map((_, index: number) => {
                    return (
                        <View
                            key={index}
                            style={{
                                height: 72,
                                marginHorizontal: 20,
                                marginVertical: 8,
                                borderRadius: 10,
                                backgroundColor: '#1f2937',
                                opacity: 0.5,
                            }}
                        >
                            <SkeletonMessage />
                        </View>
                    );
                })
            : (
                <FlatList
                    data={groupedMessages}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={groupedMessages.length === 0 ? styles.emptyListContainer : undefined}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={true}
                    getItemLayout={getItemLayout}
                />
            )
        }
            

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
                                        <Feather
                                            name={action.icon as any}
                                            size={20}
                                            color={action.id === 'delete' ? '#ef4444' : '#d1d5db'}
                                        />
                                        <Text
                                            style={[
                                                styles.modalActionText,
                                                action.id === 'delete' && styles.deleteActionText,
                                            ]}
                                        >
                                            {action.label}
                                        </Text>
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
    sectionHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#000000',
    },
    sectionHeaderText: {
        color: 'gray',
        fontSize: 16,
        fontFamily: 'Manrope-ExtraBold',
    },
    messageItem: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    messageItemPressed: {
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 10,
    },
    messageContent: {
        flex: 1,
        position: 'relative',
    },
    messageText: {
        color: '#ffffff',
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Manrope-Regular',
    },
    fadeGradient: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 30,
        height: '100%',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyStateText: {
        color: '#ffffff',
        fontSize: 18,
        fontFamily: 'Manrope-Medium',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        color: '#9ca3af',
        fontSize: 14,
        fontFamily: 'Manrope-Regular',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyListContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34, 
        paddingTop: 8,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#4b5563',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 16,
    },
    modalActionPressed: {
        backgroundColor: '#374151',
    },
    modalActionText: {
        color: '#d1d5db',
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
    },
    deleteAction: {
        borderTopWidth: 1,
        borderTopColor: '#374151',
        marginTop: 8,
    },
    deleteActionText: {
        color: '#ef4444',
    },
});

export default RecentMessages;
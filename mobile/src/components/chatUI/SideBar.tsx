import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    Animated,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    TouchableOpacity,
    PanResponder,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Colors } from '@/src/constants/Colors';
import SearchBar from './SearchBar';
import RecentMessages from '../chatUI/RecentMessages';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/src/redux/store';
import { getUsernameInitials } from '@/src/constants/getUsernameInitials';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeChatState } from '@/src/hooks/chat/states/useRealtimeChatStates';
import api from '@/src/services/axiosClient';
import { MotiView, MotiText } from 'moti';
import { setSearch } from '@/src/redux/slices/searchSlice';
import { setConversationId, setMessages, setLoading } from '@/src/redux/slices/chatSlice';
import useAuthHeaders from '@/src/constants/RequestHeader';
import { ApiMessage, Message, ConversationSummary } from '@/src/utils/interfaces/TypescriptInterfaces';
import { useRealtimeChat } from '@/src/hooks/chat/realtime/useRealtimeChats';
import { Entypo } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;
const SWIPE_THRESHOLD = SIDEBAR_WIDTH / 4; // Reduced threshold for easier closing

type CustomSideBarProps = {
    conversationId: string;
    isVisible: boolean;
    onClose: () => void;
    onOpen: () => void;
    startNewConversation?: () => void;
    onLibraryPress?: () => void;
};

const CustomSideBar: React.FC<CustomSideBarProps> = ({
    isVisible,
    conversationId,
    onClose,
    onOpen,
    startNewConversation,
    onLibraryPress
}) => {
    // Animation refs
    const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const sidebarWidth = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    
    // State
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [isDragging, setIsDragging] = useState(false);
    const [searchbarVisible, setSearchbarVisible] = useState(false);
    const prefetchCalledRef = useRef<boolean>(false);
    const [initialLoading, setIsInitialLoading] = useState(false);
    const [summaryTitle, setSummaryTitle] = useState<ConversationSummary[]>([]);
    
    // Animation lock to prevent conflicts
    const animationInProgress = useRef(false);

    const queryClient = useQueryClient();
    const { userDetails } = useRealtimeChatState();
    const { accessToken } = useSelector((state: RootState) => state.auth);
    const { search: searchQuery } = useSelector((state: RootState) => state.search);
    const dispatch = useDispatch<AppDispatch>();
    const { authHeader } = useAuthHeaders();
    const { scrollToBottom } = useRealtimeChat({});
    const { conversation_id } = useLocalSearchParams();

    // Get the actual conversation ID from URL params or props
    const actualConversationId = useMemo(() => {
        const urlConvId = Array.isArray(conversation_id) ? conversation_id[0] : conversation_id;
        return urlConvId || conversationId;
    }, [conversation_id, conversationId]);

    const {
        data,
        isLoading,
        isFetching,
        error,
    } = useQuery({
        queryKey: ['conversationSummaries', userDetails?.id],
        queryFn: async () => {
            const res = await api.get('/api/conversations/user/summary/message', authHeader);
            return res.data;
        },
        enabled: !!userDetails?.id && !!accessToken,
        refetchInterval: 10000,
        retry: 3,
        retryDelay: () => 1000 * 2,
        refetchIntervalInBackground: true,
        staleTime: 5000,
    });

    const transformApiMessages = useCallback((apiMessages: ApiMessage[]): Message[] => {
        return apiMessages.map((apiMsg) => ({
            id: apiMsg.id,
            conversation_id: apiMsg.conversation_id,
            user_id: apiMsg.user_id ? String(apiMsg.user_id) : undefined,
            sender: apiMsg.sender === 'ai' ? 'assistant' : apiMsg.sender,
            text: apiMsg.content,
            created_at: apiMsg.created_at,
            timestamp: apiMsg.created_at,
            user: apiMsg.sender === 'user',
            isLoading: false,
            content: {
                type: 'text',
                data: apiMsg.content
            }
        }));
    }, []);

    const prefetchMessages = useCallback(async (conversationId: string, userId: string) => {
        if (!conversationId || prefetchCalledRef.current) {
            return;
        }

        prefetchCalledRef.current = true;

        try {
            setIsInitialLoading(true);
            const data = await queryClient.fetchQuery({
                queryKey: ['conversationMessages', conversationId],
                queryFn: async () => {
                    const response = await api.get(`/api/conversations/summary/messages?conversationId=${conversationId}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    return response.data;
                },
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
            });

            if (data && data.messages) {
                const transformedMessages = transformApiMessages(data.messages);
                dispatch(setMessages(transformedMessages));
                dispatch(setLoading(false));

                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }
        } catch (error) {
            console.error('Error prefetching messages:', error);
        } finally {
            setIsInitialLoading(false);
        }
    }, [queryClient, dispatch, transformApiMessages, accessToken, scrollToBottom]);

    const deleteSummary = async (conversationId: string) => {
        try {
            console.log(`Deleting conversation: ${conversationId}`);
            // Add your delete API call here
            // await api.delete(`/api/conversations/${conversationId}`, authHeader);
            // queryClient.invalidateQueries(['conversationSummaries', userDetails?.id]);
        } catch (error) {
            console.log('Error deleting conversation:', error);
        }
    };

    useEffect(() => {
        prefetchCalledRef.current = false;
        if (actualConversationId) {
            prefetchMessages(actualConversationId, '');
        }
    }, [actualConversationId, prefetchMessages]);

    useEffect(() => {
        if (data?.conversations) {
            const formatted = data?.conversations.map((conversation: ConversationSummary) => ({
                conversation_id: conversation.conversation_id,
                title: conversation.title,
                created_at: conversation.created_at
            }));
            setSummaryTitle(formatted);
        }
    }, [data]);

    const username = userDetails?.username;
    const userInitials = getUsernameInitials({ fullname: userDetails?.username ?? '' });

    const onSearch = (query: string) => {
        dispatch(setSearch(query));
    };

    const clearSearch = () => {
        dispatch(setSearch(''));
    };

    const openSettings = () => {
        router.push('/(home)/settings');
    };

    const handleLibraryPress = () => {
        console.log('Library pressed');
        onLibraryPress?.();
    };

    // Smooth sidebar width animation for search
    useEffect(() => {
        if (animationInProgress.current) return;

        Animated.timing(sidebarWidth, {
            toValue: searchbarVisible ? width : SIDEBAR_WIDTH,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [searchbarVisible]);

    // PanResponder with improved logic
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !searchbarVisible && !animationInProgress.current,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (searchbarVisible || animationInProgress.current) return false;
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 3);
            },
            onPanResponderGrant: () => {
                setIsDragging(true);
            },
            onPanResponderMove: (_, gestureState) => {
                if (animationInProgress.current || searchbarVisible) return;

                if (isVisible) {
                    if (gestureState.dx < 0) {
                        translateX.setValue(Math.max(gestureState.dx, -SIDEBAR_WIDTH));
                    }
                } else {
                    const newValue = -SIDEBAR_WIDTH + gestureState.dx;
                    translateX.setValue(Math.min(newValue, 0));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsDragging(false);
                if (searchbarVisible || animationInProgress.current) return;

                animationInProgress.current = true;

                if (isVisible) {
                    // More lenient closing conditions
                    if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.3) {
                        Animated.spring(translateX, {
                            toValue: -SIDEBAR_WIDTH,
                            useNativeDriver: false,
                            tension: 65,
                            friction: 11,
                        }).start(() => {
                            animationInProgress.current = false;
                            onClose();
                        });
                    } else {
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: false,
                            tension: 65,
                            friction: 11,
                        }).start(() => {
                            animationInProgress.current = false;
                        });
                    }
                } else {
                    if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.5) {
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: false,
                            tension: 65,
                            friction: 11,
                        }).start(() => {
                            animationInProgress.current = false;
                            onOpen();
                        });
                    } else {
                        Animated.spring(translateX, {
                            toValue: -SIDEBAR_WIDTH,
                            useNativeDriver: false,
                            tension: 65,
                            friction: 11,
                        }).start(() => {
                            animationInProgress.current = false;
                        });
                    }
                }
            },
        })
    ).current;

    // Main visibility animation - prevent auto-open on mount
    useEffect(() => {
        if (animationInProgress.current) return;

        if (isVisible) {
            setShouldRender(true);
            animationInProgress.current = true;
            
            requestAnimationFrame(() => {
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: false,
                    tension: 65,
                    friction: 11,
                    velocity: isDragging ? 0 : undefined,
                }).start(() => {
                    animationInProgress.current = false;
                });
            });
        } else {
            // Only animate close if sidebar was previously rendered
            if (shouldRender) {
                animationInProgress.current = true;
                
                Animated.spring(translateX, {
                    toValue: -SIDEBAR_WIDTH,
                    useNativeDriver: false,
                    tension: 65,
                    friction: 11,
                    velocity: isDragging ? 0 : undefined,
                }).start(() => {
                    setShouldRender(false);
                    animationInProgress.current = false;
                });
            }
        }
    }, [isVisible]);

    const backdropOpacity = translateX.interpolate({
        inputRange: [-SIDEBAR_WIDTH, 0],
        outputRange: [0, 0.5],
        extrapolate: 'clamp',
    });

    return shouldRender ? (
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={onClose} disabled={!isVisible}>
                <Animated.View 
                    style={[styles.backdrop, { opacity: backdropOpacity }]} 
                    pointerEvents={isVisible ? 'auto' : 'none'}
                />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX }],
                        width: sidebarWidth
                    }
                ]}
                {...panResponder.panHandlers}
            >
                <View style={styles.contentContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={onSearch}
                        onSearch={() => {}}
                        onClear={clearSearch}
                        onCancel={() => setSearchbarVisible(false)}
                    />

                    <TouchableOpacity
                        style={[styles.libraryContainer, { marginBottom: 2 }]}
                        onPress={() => {
                            setSearchbarVisible(false);
                            startNewConversation?.();
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.libraryContent}>
                            <Feather
                                size={20}
                                name="edit"
                                color={Colors.dark.txtSecondary}
                            />
                            <Text style={styles.libraryText}>New Chat</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.libraryContainer, { marginBottom: 2, marginTop: 0 }]}
                        onPress={handleLibraryPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.libraryContent}>
                            <Entypo name='images' size={22} color={Colors.dark.txtSecondary} />
                            <Text style={styles.libraryText}>Library</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Recents</Text>
                </View>

                <RecentMessages
                    isFetching={isFetching}
                    isLoading={isLoading}
                    messages={summaryTitle}
                    search={searchQuery}
                    activeConversationId={actualConversationId}
                    onArchiveChat={() => console.log('Archive')}
                    onDeleteChat={(id) => deleteSummary(id)}
                    onRenameChat={() => console.log('Rename')}
                />

                <View style={styles.bottom}>
                    <TouchableOpacity style={styles.bottomContent} onPress={openSettings}>
                        <TouchableOpacity style={styles.userCont} onPress={openSettings}>
                            {userInitials ? (
                                <View style={styles.userAccountButton}>
                                    <Text style={styles.userText}>{userInitials}</Text>
                                </View>
                            ) : (
                                <MotiView
                                    style={[styles.userAccountButton, { backgroundColor: '#555' }]}
                                    from={{ opacity: 0.3 }}
                                    animate={{ opacity: 1 }}
                                    transition={{
                                        loop: true,
                                        type: 'timing',
                                        duration: 1000,
                                        repeatReverse: true,
                                    }}
                                />
                            )}

                            {username ? (
                                <Text style={styles.userText}>{username}</Text>
                            ) : (
                                <MotiView
                                    style={{ width: 80, height: 20, borderRadius: 4, backgroundColor: '#555' }}
                                    from={{ opacity: 0.3 }}
                                    animate={{ opacity: 1 }}
                                    transition={{
                                        loop: true,
                                        type: 'timing',
                                        duration: 1000,
                                        repeatReverse: true,
                                    }}
                                />
                            )}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    ) : null;
};

const styles = StyleSheet.create({
    overlay: {
        zIndex: 1000,
        elevation: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,1)',
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#000000',
        justifyContent: 'space-between',
    },
    contentContainer: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    item: {
        paddingVertical: 12,
    },
    itemText: {
        color: '#d1d5db',
        fontSize: 16,
    },
    bottom: {
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#1f2937',
        marginBottom: 20,
    },
    bottomContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
    },
    userAccountButton: {
        width: 40,
        height: 40,
        backgroundColor: Colors.dark.button,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userCont: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    userText: {
        color: Colors.dark.txtPrimary,
        fontSize: 14,
        fontFamily: 'Manrope-ExtraBold',
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
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        paddingHorizontal: 10,
    },
    libraryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 12,
    },
    libraryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    libraryText: {
        color: Colors.dark.txtPrimary,
        fontSize: 15,
        fontFamily: 'Manrope-SemiBold',
    },
});

export default CustomSideBar;
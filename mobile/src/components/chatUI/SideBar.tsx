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
import { Edit, Images, Library } from 'lucide-react-native';
import { setSearch } from '@/src/redux/slices/searchSlice';
import { setConversationId, setMessages, setLoading } from '@/src/redux/slices/chatSlice';
import useAuthHeaders from '@/src/constants/RequestHeader';
import { ApiMessage, Message, ConversationSummary } from '@/src/utils/interfaces/TypescriptInterfaces';
import { useRealtimeChat } from '@/src/hooks/chat/realtime/useRealtimeChats';




const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;
const SWIPE_THRESHOLD = SIDEBAR_WIDTH / 3;

type CustomSideBarProps = {
    conversationId: string,
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

    //states
    const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const sidebarWidth = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [isDragging, setIsDragging] = useState(false);
    const [searchbarVisible, setSearchbarVisible] = useState(false);
    const prefetchCalledRef = useRef<boolean>(false);
    const [initialLoading, setIsInitialLoading] = useState(false);

    const queryClient = useQueryClient();

    const { userDetails } = useRealtimeChatState();
    const { accessToken } = useSelector((state: RootState) => state.auth);

    const [summaryTitle, setSummaryTitle] = useState<ConversationSummary[]>([]);

    //search function
    const { search: searchQuery } = useSelector((state: RootState) => state.search);
    const dispatch = useDispatch<AppDispatch>();
    const { authHeader } = useAuthHeaders();
    const { scrollToBottom } = useRealtimeChat({});

        const { conversation_id } = useLocalSearchParams();
        
          // Get the actual conversation ID - memoize to prevent re-renders
          const actualConversationId = useMemo(() =>
        Array.isArray(conversation_id) ? conversation_id[0] : conversation_id,
        [conversation_id]
      );

    const {
        data,
        isLoading,
        isFetching,
        error,
    } = useQuery({
        queryKey: ['conversationSummaries', userDetails?.id],
        queryFn: async () => {
            const res = await api.get('/api/conversations/user/summary/message', authHeader);
            setConversationId(res.data.conversation_id || '');
            return res.data;
        },
        enabled: !!userDetails?.id && !!accessToken,
        refetchInterval: 10000,
        retry: 3,
        retryDelay: () => 1000 * 2,
        refetchIntervalInBackground: true,
        staleTime: 5000,
    });



    // Function to transform API messages to internal Message format
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


   


    // Prefetch messages for specific conversation id
    const prefetchMessages = useCallback(async (conversationId: string, userId: string) => {
        if (!conversationId || !userId || prefetchCalledRef.current) {
            console.log('Skipping prefetch - already called or missing params');
            return;
        }

        prefetchCalledRef.current = true;

        try {
            setIsInitialLoading(true);
            console.log(`Prefetching messages for conversation: ${conversationId}`);

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
                console.log(`Fetched ${data.messages?.length} messages`);
                const transformedMessages = transformApiMessages(data.messages);
                dispatch(setMessages(transformedMessages));
                dispatch(setLoading(false));

                // Small delay to ensure state is updated before scrolling
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
            console.log(`active conversation id: ${conversationId}`)
            //const response = await api.delete(`/api/conversations/${activeConversationId}`, authHeader);
            //console.log(response.data);
        }
        catch (error) {
            console.log(error)
        }
    }

    
     useEffect(() => {
        //reset flag when conversation changes 
        prefetchCalledRef.current = false;
        if (conversationId) {
            prefetchMessages(conversationId, '');
        }
    },[conversationId, prefetchMessages]);

    //Effect to update local state when data changes
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

    //getting username from redux state
    const username = userDetails?.username
    const userInitials = getUsernameInitials({ fullname: userDetails?.username ?? '' });

    //onChange function for searchbar
    const onSearch = (query: string) => {
        dispatch(setSearch(query));
    }

    //clear search function
    const clearSearch = () => {
        dispatch(setSearch(''));
    }

    //open settings screen
    const openSettings = () => {
        router.push('/(home)/settings');
    }

    //handle library press
    const handleLibraryPress = () => {
        console.log('Library pressed');
        onLibraryPress?.();
    }

    useEffect(() => {
        Animated.timing(sidebarWidth, {
            toValue: searchbarVisible ? width : SIDEBAR_WIDTH,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [searchbarVisible, sidebarWidth]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !searchbarVisible,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (searchbarVisible) return false;
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 3);
            },
            onPanResponderGrant: () => {
                setIsDragging(true);
            },
            onPanResponderMove: (_, gestureState) => {
                if (isVisible && !searchbarVisible) {
                    if (gestureState.dx < 0) {
                        translateX.setValue(gestureState.dx);
                    }
                } else if (!isVisible && !searchbarVisible) {
                    translateX.setValue(-SIDEBAR_WIDTH + gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsDragging(false);
                if (searchbarVisible) return;

                if (isVisible) {
                    if (gestureState.dx < -SWIPE_THRESHOLD) {
                        onClose();
                    } else {
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: false,
                        }).start();
                    }
                } else {
                    if (gestureState.dx > SWIPE_THRESHOLD) {
                        onOpen();
                    } else {
                        Animated.spring(translateX, {
                            toValue: -SIDEBAR_WIDTH,
                            useNativeDriver: false,
                        }).start();
                    }
                }
            },
        })
    ).current;

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            Animated.timing(translateX, {
                toValue: 0,
                duration: isDragging ? 0 : 300,
                useNativeDriver: false,
            }).start();
        } else {
            Animated.timing(translateX, {
                toValue: -SIDEBAR_WIDTH,
                duration: isDragging ? 0 : 300,
                useNativeDriver: false,
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [isVisible, translateX, isDragging]);

    const backdropOpacity = translateX.interpolate({
        inputRange: [-SIDEBAR_WIDTH, 0],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });


    return shouldRender ? (
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
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
                    {/* Search Bar */}
                    <SearchBar
                        value={searchQuery}
                        onChangeText={onSearch}
                        onSearch={() => { /* implement search logic here if needed */ }}
                        onClear={clearSearch}
                        onCancel={() => setSearchbarVisible(false)}
                    />

                    {/* New chat Section */}
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

                    {/* Library Section */}
                    <TouchableOpacity
                        style={[styles.libraryContainer, { marginBottom: 2, marginTop: 0 }]}
                        onPress={handleLibraryPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.libraryContent}>
                            <Images strokeWidth={2} color={Colors.dark.txtSecondary} />
                            <Text style={styles.libraryText}>Library</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Recents</Text>
                </View>

                {/* recent messages - Only show loading for initial load */}
                <RecentMessages
                    isFetching={isFetching}
                    isLoading={isLoading}
                    messages={summaryTitle}
                    search={searchQuery}
                    activeConversationId={conversationId}
                    onArchiveChat={() => console.log}
                    onDeleteChat={(id) => deleteSummary(id)}
                    onRenameChat={() => console.log}
                />

                <View style={styles.bottom}>
                    <TouchableOpacity style={styles.bottomContent} onPress={openSettings}>
                        <TouchableOpacity style={styles.userCont} onPress={openSettings}>
                            <View style={styles.userAccountButton}>
                                <Text style={styles.userText}>{userInitials}</Text>
                            </View>
                            <Text style={styles.userText}>{username}</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
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
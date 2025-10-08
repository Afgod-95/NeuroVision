import {
  View,
  Text,
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Platform,
  FlatList,
  StatusBar
} from 'react-native';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Colors } from '@/src/constants/Colors';
import ChatInput from '@/src/components/chatUI/ChatInput';
import CustomSideBar from '@/src/components/chatUI/SideBar';
import { AppDispatch, RootState } from '@/src/redux/store';
import { Message, ApiMessage } from '@/src/utils/interfaces/TypescriptInterfaces';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import UserMessageBox, { MessagePreview } from '@/src/components/chatUI/UserMessageBox';
import AdvancedAIResponse from '@/src/components/chatUI/AIResponse';
import UploadedFiles, { UploadedFile } from '@/src/components/chatUI/upload-files/UploadFiles';
import { uniqueConvId } from '@/src/constants/generateConversationId';
import { useRealtimeChat } from '@/src/hooks/chat/realtime/useRealtimeChats';
import Loading from '@/src/components/Loaders/Loading';
import ScrollToBottomButton from '@/src/components/chatUI/ScrollToBottomButton';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeChatState } from '@/src/hooks/chat/states/useRealtimeChatStates';
import BottomSheetModal from '@/src/components/chatUI/FileUploadBottomSheet';
import Welcome from '@/src/components/chatUI/welcome-screen/Welcome';
import api from '@/src/services/axiosClient';
import { useDispatch, useSelector } from 'react-redux';
import { setOpenBottomSheet, setSidebarVisible, setMessage, setMessages, setLoading, setAttachments } from '@/src/redux/slices/chatSlice';

// Extend UploadedAudioFile to include duration
type UploadedAudioFile = UploadedFile & {
  duration?: number;
};

// Speech Banner State Interface - Updated for local TTS
interface SpeechBannerState {
  visible: boolean;
  message: string;
  isGenerating: boolean;
  isSpeaking: boolean;
}

// Memoized UserMessageBox with proper prop comparison
const MemoizedUserMessageBox = React.memo(UserMessageBox, (prevProps, nextProps) => {
  return (
    prevProps.message === nextProps.message &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.userMessage === nextProps.userMessage &&
    JSON.stringify(prevProps.messageContent) === JSON.stringify(nextProps.messageContent)
  );
});

// Memoized AdvancedAIResponse with proper prop comparison
const MemoizedAdvancedAIResponse = React.memo(AdvancedAIResponse, (prevProps, nextProps) => {
  return (
    prevProps.message === nextProps.message &&
    prevProps.loading === nextProps.loading
  );
});

const Index = () => {
  // Get message options from Redux
  const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);
  const dispatch = useDispatch<AppDispatch>();
  const { openBottomSheet, isSidebarVisible } = useSelector((state: RootState) => state.chat);

  // Use Redux as single source of truth for messages
  const reduxMessages = useSelector((state: RootState) => state.chat.messages);
  const { loading, isAIResponding, isTyping, isAborted } = useSelector((state: RootState) => state.chat);

  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Add keyboard height tracking
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // Get status bar height for proper header spacing
  const statusBarHeight = StatusBar.currentHeight || 0;

  const { conversation_id } = useLocalSearchParams();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient();

  // Get the actual conversation ID - memoize to prevent re-renders
  const actualConversationId = useMemo(() =>
    Array.isArray(conversation_id) ? conversation_id[0] : conversation_id,
    [conversation_id]
  );

  // Initialize the realtime chat hook with stable callbacks
  const stableOnMessagesChange = useCallback((messages: Message[]) => {
    console.log('Messages updated from hook:', messages?.length);
    // Don't dispatch here to avoid conflicts - Redux is source of truth
  }, []);

  const stableOnLoadingChange = useCallback((loading: boolean) => {
    console.log('Loading state from hook:', loading);
  }, []);

  //realtime actions endpoint
  const realtimeActions = useRealtimeChat({
    uniqueConvId: uniqueConvId,
    systemPrompt: "You are NeuroVision, a helpful AI assistant specialized in providing comprehensive and accurate assistance across various topics.",
    temperature: 0.7,
    maxTokens: 4096,
    onMessagesChange: stableOnMessagesChange,
    onLoadingChange: stableOnLoadingChange,
    initialMessages: [],
    enableSampleMessages: true,
  });

  

  // Stop message handler
  const handleStopMessage = useCallback(() => {
    realtimeActions.abortMessage();
  }, [realtimeActions]);

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

  // Ref to track if prefetch has been called to prevent multiple calls
  const prefetchCalledRef = useRef(false);

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
          const response = await api.get(`/api/conversations/summary/message?conversationId=${conversationId}`, {
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
          realtimeActions.scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('Error prefetching messages:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [queryClient, dispatch, transformApiMessages, accessToken, realtimeActions]);

  // Effect to prefetch messages - only run once per conversation
  useEffect(() => {
    if (actualConversationId && realtimeActions.userDetails?.id && !prefetchCalledRef.current) {
      const userId = String(realtimeActions.userDetails.id);
      console.log('Triggering prefetch for:', actualConversationId);
      prefetchMessages(actualConversationId, userId);
    }
  }, [actualConversationId, realtimeActions.userDetails?.id, prefetchMessages]);

  // Reset prefetch flag when conversation changes
  useEffect(() => {
    prefetchCalledRef.current = false;
  }, [actualConversationId]);

  // Track sending state - use mutation status directly without effect
  const mutationIsPending = realtimeActions.sendMessageMutation?.isPending || false;

  useEffect(() => {
    setIsSending(mutationIsPending);
  }, [mutationIsPending]);

  // Scroll to bottom handler
  const onScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    const isAtBottom = offsetY + layoutHeight >= contentHeight - 50;
    setShowScrollButton(!isAtBottom && offsetY > 50);
  }, []);

  // Sidebar handlers
  const handleToggleSidebar = useCallback(() => {
    dispatch(setSidebarVisible(true));
  }, [dispatch]);

  const handleCloseSidebar = useCallback(() => {
    dispatch(setSidebarVisible(false));
  }, [dispatch]);

  const handleOpenSidebar = useCallback(() => {
    realtimeActions.setIsSidebarVisible(!isSidebarVisible);
  }, [realtimeActions, isSidebarVisible]);

  // State for bottom sheet
  const state = useRealtimeChatState();

  // Bottom sheet handler
  const HandleOpenBottomSheet = useCallback(() => {
    dispatch(setOpenBottomSheet(!openBottomSheet));
    state.bottomSheetRef.current?.expand();
  }, [dispatch, state.bottomSheetRef, openBottomSheet]);

  // File upload handlers
  const handleFileSelected = useCallback((file: UploadedFile) => {
    const newAttachments = [...state.attachments, file];
    state.setAttachments(newAttachments);
  }, [state]);

  const handleRemoveFile = useCallback((fileId: string) => {
    const filteredAttachments = state.attachments.filter((item: any) => item?.id !== fileId);
    state.setAttachments(filteredAttachments);
  }, [state]);

  //handle send messages with text, files etc
  const onSendMessage = useCallback((message: string) => {
  console.log('onSendMessage called:', {
    message: message.substring(0, 50),
    attachmentsCount: state.attachments.length,
    conversationId: actualConversationId
  });

  // Log attachments for debugging
  if (state.attachments.length > 0) {
    console.log('Attachments:', state.attachments.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));
  }

  // Send message with text and uploaded files
  realtimeActions.handleSendMessage(
    message,
    undefined,
    state.attachments
  );
}, [realtimeActions, state.attachments, actualConversationId]);


  // Enhanced keyboard handling for Android
  useEffect(() => {
    let keyboardDidShowListener: any;
    let keyboardDidHideListener: any;

    if (Platform.OS === 'android') {
      keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsKeyboardVisible(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });

      keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });
    } else {
      // iOS listeners
      keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsKeyboardVisible(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });

      keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });
    }

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // renderItem function with proper loading state logic
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    if (item?.user) {
      return (
        <MemoizedUserMessageBox
          message={item.text}
          messageId={item?.id}
          userMessage={true}
          messageContent={item.content}
        />
      );
    } else {
      const isLastMessage = index === reduxMessages?.length - 1;

      // Show loading only if:
      // 1. It's explicitly marked as loading (isLoading: true)
      // 2. OR it's the last message, AI is responding, and text is empty
      const shouldShowLoading = item.isLoading === true ||
        (isLastMessage && isAIResponding && item.text.trim() === '');

      return (
        <MemoizedAdvancedAIResponse
          isTyping={item.isTyping || false}  // Pass the message's typing state
          message={item.text}
          loading={shouldShowLoading}
          onRegenerate={() => realtimeActions.handleRegenerate(item?.id)}
        />
      );
    }
  }, [reduxMessages?.length, isAIResponding, realtimeActions]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Message) => {
    return `${item?.id}-${item?.sender}-${item.user ? 'user' : 'ai'}`;
  }, []);

  // Memoized content components - stable references
  const welcomeContent = useMemo(() => (
    <Welcome
      username={realtimeActions?.username}
      newChat={realtimeActions.newChat}
      onPromptSelect={(prompt) => dispatch(setMessage(prompt))}
      handleSendMessage={(prompt) => realtimeActions.handleSendMessage(prompt)}
    />
  ), [ dispatch, realtimeActions]);

  


  const loadingContent = useMemo(() => (
    <Loading />
  ), []);

  // Determine what to show based on loading states - stable references
  const shouldShowLoading = loading || isInitialLoading;
  const shouldShowWelcome = !shouldShowLoading && reduxMessages?.length === 0;
  const shouldShowMessages = !shouldShowLoading && reduxMessages?.length > 0;

  // Main content - simplified to prevent re-render loops
  const mainContent = useMemo(() => {
    if (shouldShowLoading) return loadingContent;
    if (shouldShowWelcome) return welcomeContent;
    if (shouldShowMessages) {
      return (
        <>
          <FlatList
            ref={realtimeActions.flatListRef}
            data={reduxMessages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.flatListContent,
              styles.flatListContentWithBanner
            ]}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            decelerationRate="normal"
            scrollEventThrottle={16}
            onScroll={onScroll}
            nestedScrollEnabled={true}
            getItemLayout={undefined}
            extraData={reduxMessages?.length}
          />
          {!isTyping && (
            <ScrollToBottomButton
              onPress={realtimeActions.scrollToBottom}
              visible={showScrollButton}
            />
          )}
        </>
      );
    }
    return null;
  }, [
    shouldShowLoading,
    shouldShowWelcome,
    shouldShowMessages,
    loadingContent,
    welcomeContent,
    reduxMessages,
    keyExtractor,
    renderItem,
    onScroll,
    showScrollButton,
    isTyping,
    realtimeActions.flatListRef,
    realtimeActions.scrollToBottom
  ]);

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Background Image */}
          <Image
            source={require('@/src/assets/images/CircularGradient.png')}
            style={styles.backgroundImage}
          />

          {/* Use conditional rendering for Android vs iOS keyboard handling */}
          {Platform.OS === 'android' ? (
            <View style={[styles.keyboardContainer, { paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }]}>
              <SafeAreaView style={styles.safeAreaContainer}>
                <View style={[
                  styles.header,
                  (Platform.OS as any) === 'android' ? { paddingTop: statusBarHeight + 10 } : {}
                ]}>
                  <TouchableOpacity onPress={handleToggleSidebar}>
                    <Image
                      source={require('@/src/assets/images/menu.png')}
                      style={styles.menuIcon}
                    />
                  </TouchableOpacity>

                  <Text style={styles.headerTitle}>NeuroVision</Text>
                  {reduxMessages?.length !== 0 ? (
                    <TouchableOpacity onPress={realtimeActions.startNewConversation}>
                      <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                    </TouchableOpacity>
                  ) : (<View />)}
                </View>

                {/* Content Area */}
                {mainContent}
              </SafeAreaView>

              {/* USER MESSAGE PREVIEW */}
              <MessagePreview
                message={messageId ?? ''}
                messageId={messageId ?? ''}
                userMessage={true}
                editMessage={realtimeActions.handleEditMessageCallback}
              />

              {/* Chat input */}
              <ChatInput
                onRemoveFile={handleRemoveFile}
                uploadedFiles={state.attachments}
                openBottomSheet={HandleOpenBottomSheet}
                onSendMessage={onSendMessage}
                onStopMessage={handleStopMessage}
                isSending={isSending || isTyping}
              />
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.keyboardContainer}
              behavior="padding"
              keyboardVerticalOffset={0}
            >
              <SafeAreaView style={styles.safeAreaContainer}>
                <View style={[
                  styles.header,
                  Platform.OS as any === 'android' ? { paddingTop: statusBarHeight + 10 } : {}
                ]}>
                  <TouchableOpacity onPress={handleToggleSidebar}>
                    <Image
                      source={require('@/src/assets/images/menu.png')}
                      style={styles.menuIcon}
                    />
                  </TouchableOpacity>

                  <Text style={styles.headerTitle}>NeuroVision</Text>
                  {reduxMessages?.length !== 0 ? (
                    <TouchableOpacity onPress={realtimeActions.startNewConversation}>
                      <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                    </TouchableOpacity>
                  ) : (<View />)}
                </View>

                {/* Content Area */}
                {mainContent}
              </SafeAreaView>

              {/* USER MESSAGE PREVIEW */}
              <MessagePreview
                message={messageId ?? ''}
                messageId={messageId ?? ''}
                userMessage={true}
                editMessage={realtimeActions.handleEditMessageCallback}
              />

              {/* Chat input */}
              <ChatInput
                onRemoveFile={handleRemoveFile}
                uploadedFiles={state.attachments}
                openBottomSheet={HandleOpenBottomSheet}
                onSendMessage={realtimeActions.handleSendMessage}
                onStopMessage={handleStopMessage}
                isSending={isSending || isTyping}
              />
            </KeyboardAvoidingView>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <CustomSideBar
        isVisible={realtimeActions.isSidebarVisible}
        onClose={handleCloseSidebar}
        onOpen={handleOpenSidebar}
        startNewConversation={realtimeActions.startNewConversation}
      />

      <BottomSheetModal
        onFileSelected={handleFileSelected}
        bottomSheetRef={state.bottomSheetRef}
      />

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgPrimary,
  },
  backgroundImage: {
    position: 'absolute',
    top: -150,
    right: -170,
    width: 500,
    height: 500,
    zIndex: -1,
  },
  keyboardContainer: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 60,
    zIndex: 999,
  },
  headerWithBanner: {
    marginTop: 8,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 24,
    color: Colors.dark.txtPrimary,
  },
  welcomeText: {
    fontSize: 20,
    color: Colors.dark.button,
    textAlign: 'center',
    fontFamily: 'Manrope-ExtraBold',
  },
  boldText: {
    color: Colors.dark.txtPrimary,
  },
  subText: {
    fontFamily: 'Manrope-Medium',
    color: Colors.dark.txtSecondary,
    marginTop: 10,
    fontSize: 16,
  },
  flatListContent: {
    paddingHorizontal: 16,
  },
  flatListContentWithBanner: {
    paddingTop: 8,
  },
  aiRespondingIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  aiRespondingText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: Colors.dark.txtSecondary,
    fontStyle: 'italic',
  },
});

export default Index;
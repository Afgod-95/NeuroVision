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
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { Message, ApiResponse, ApiMessage } from '@/src/utils/interfaces/TypescriptInterfaces';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import UserMessageBox, { MessagePreview, MessageContent } from '@/src/components/chatUI/UserMessageBox';
import AdvancedAIResponse from '@/src/components/chatUI/AIResponse';
import UploadedFiles, { UploadedFile } from '@/src/components/chatUI/uploaded-files/UploadedFiles';
import { uniqueConvId } from '@/src/constants/generateConversationId';
import { useRealtimeChat } from '@/src/hooks/chat/useRealtimeChats';
import Loading from '@/src/components/Loaders/Loading';
import ScrollToBottomButton from '@/src/components/chatUI/ScrollToBottomButton';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { setOptions } from 'expo-splash-screen';
import { useRealtimeChatState } from '@/src/hooks/chat/states/useRealtimeChatStates';
import BottomSheetModal from '@/src/components/chatUI/FileUploadBottomSheet';
import Welcome from '@/src/components/chatUI/welcome-screen/Welcome';

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
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Add keyboard height tracking
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  
  // Get status bar height for proper header spacing
  const statusBarHeight = StatusBar.currentHeight || 0;
  
  const { conversation_id } = useLocalSearchParams();
  console.log(`Conversation ID: ${conversation_id}`);

  const { user, accessToken, refreshToken } = useSelector((state: RootState) => state.auth);

  console.log(`User Details: ${user}`);
  console.log(`AccessToken: ${accessToken}`);
  console.log(`RefreshToken: ${refreshToken}`)

  const queryClient = useQueryClient();

  // Get the actual conversation ID
  const actualConversationId = Array.isArray(conversation_id) ? conversation_id[0] : conversation_id;

  // Initialize the realtime chat hook
  const realtimeActions = useRealtimeChat({
    uniqueConvId: uniqueConvId,
    systemPrompt: "You are NeuroVision, a helpful AI assistant specialized in providing comprehensive and accurate assistance across various topics.",
    temperature: 0.7,
    maxTokens: 4096,
    onMessagesChange: (messages) => {
      console.log('Messages updated:', messages.length);
    },
    onLoadingChange: (loading) => {
      console.log('Loading state:', loading);
    },
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

  // Prefetch messages for specific conversation id
  const prefetchMessages = useCallback(async (conversationId: string, userId: string) => {
    if (!conversationId || !userId) {
      console.log('Missing conversationId or userId for prefetch');
      return;
    }

    try {
      setIsInitialLoading(true);
      console.log(`Prefetching messages for conversation: ${conversationId}`);

      const data = await queryClient.fetchQuery({
        queryKey: ['conversationMessages', conversationId, userId],
        queryFn: async () => {
          const response = await axios.get<ApiResponse>('/api/conversations/messages', {
            params: {
              conversationId,
              userId,
            },
          });
          return response.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
      });

      if (data && data.messages) {
        console.log(`Fetched ${data.messages.length} messages`);
        const transformedMessages = transformApiMessages(data.messages);
        realtimeActions.setMessages(transformedMessages);
        realtimeActions.scrollToBottom();
      }
    } catch (error) {
      console.error('Error prefetching messages:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [queryClient, transformApiMessages, realtimeActions]);

  // Effect to prefetch messages when conversation_id is available
  useEffect(() => {
    if (actualConversationId && realtimeActions.userCredentials?.id) {
      console.log('Triggering prefetch for:', actualConversationId);
      prefetchMessages(
        actualConversationId,
        String(realtimeActions.userCredentials.id)
      );
    }
  }, [actualConversationId, realtimeActions.userCredentials?.id, prefetchMessages]);

  // Track sending state based on mutation status
  useEffect(() => {
    if (realtimeActions.sendMessageMutation) {
      setIsSending(realtimeActions.sendMessageMutation.isPending || realtimeActions.sendMessageMutation.isPending);
    }
  }, [realtimeActions]);

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
    realtimeActions.setIsSidebarVisible(!realtimeActions.isSidebarVisible);
  }, [realtimeActions]);

  const handleCloseSidebar = useCallback(() => {
    realtimeActions.setIsSidebarVisible(false);
  }, [realtimeActions]);

  const handleOpenSidebar = useCallback(() => {
    realtimeActions.setIsSidebarVisible(true);
  }, [realtimeActions]);

  //state for bottom sheet
  const state = useRealtimeChatState()

  //bottom sheet
  const HandleOpenBottomSheet = () => {
    state.setOpenBottomSheet(true);
    state.bottomSheetRef.current?.expand()
  };

  //handle file upload
  const handleFileSelected = (file: UploadedFile) => {
    state.setAttachments((prev) => [...prev, file]);
  };

  const handleRemoveFile = (fileId: string) => {
    state.setAttachments((prev) => prev.filter((item) => item.id !== fileId));
  }

  // Message input handlers
  const handleMessageOnChange = useCallback((text: string) => {
    realtimeActions.setMessage(text);
  }, [realtimeActions]);

  const handleIsRecording = useCallback((recording: boolean) => {
    realtimeActions.setIsRecording(recording);
  }, [realtimeActions]);

  // Handle send message with proper typing
  const handleSendMessageWithAudio = useCallback((messageText: string, audioFile?: UploadedAudioFile) => {
    realtimeActions.handleSendMessage(messageText, audioFile);
  }, [realtimeActions]);

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

  // Render item function for FlatList
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    console.log(`Rendering message ${index}:`, { id: item.id, user: item.user, sender: item.sender });

    if (item.user) {
      return (
        <MemoizedUserMessageBox
          message={item.text}
          messageId={item.id}
          userMessage={true}
          messageContent={item.content}
        />
      );
    } else {
      const isLastMessage = index === realtimeActions.messages.length - 1;
      const shouldShowLoading = isLastMessage &&
        realtimeActions.isAIResponding &&
        (item.text.trim() === '' || item.isLoading === true);

      // Force loading to false if AI is not responding
      const finalLoadingState = realtimeActions.isAIResponding ? shouldShowLoading : false;

      return (
        <MemoizedAdvancedAIResponse
          isTyping={realtimeActions.isTyping}
          showAIButtonAction={realtimeActions.showAIActionButton}
          isAborted={realtimeActions.isAborted}
          message={item.text}
          loading={finalLoadingState}
          onRegenerate={() => realtimeActions.handleRegenerate(item.id)}
        />
      );
    }
  }, [realtimeActions]);

  // Debug logging for loading states
  useEffect(() => {
    if (realtimeActions.messages.length > 0) {
      const lastMessage = realtimeActions.messages[realtimeActions.messages.length - 1];
      console.log('Loading State Debug:', {
        messageId: lastMessage.id,
        messageText: lastMessage.text.substring(0, 30) + '...',
        messageIsLoading: lastMessage.isLoading,
        globalIsAIResponding: realtimeActions.isAIResponding,
        globalLoading: realtimeActions.loading,
        initialLoading: isInitialLoading,
      });
    }
  }, [realtimeActions.messages, realtimeActions.isAIResponding, realtimeActions.loading, isInitialLoading]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Message) => {
    return `${item.id}-${item.sender}-${item.user ? 'user' : 'ai'}`;
  }, []);

  // Memoized content components
  const welcomeContent = useMemo(() => (
    <Welcome
      username={realtimeActions.username}
      newChat={realtimeActions.newChat}
      onPromptSelect={(prompt) => realtimeActions.setMessage(prompt)}
    />
  ), [realtimeActions]);

  const loadingContent = useMemo(() => (
    <Loading />
  ), []);

  // Determine what to show based on loading states
  const shouldShowLoading = realtimeActions.loading || isInitialLoading;
  const shouldShowWelcome = !shouldShowLoading && realtimeActions.messages.length === 0;
  const shouldShowMessages = !shouldShowLoading && realtimeActions.messages.length > 0;

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
                  Platform.OS === 'android' && { paddingTop: statusBarHeight + 10 }
                ]}>
                  <TouchableOpacity onPress={handleToggleSidebar}>
                    <Image
                      source={require('@/src/assets/images/menu.png')}
                      style={styles.menuIcon}
                    />
                  </TouchableOpacity>

                  <Text style={styles.headerTitle}>NeuroVision</Text>
                  {realtimeActions.messages.length !== 0 ? (
                    <TouchableOpacity onPress={realtimeActions.startNewConversation}>
                      <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                    </TouchableOpacity>
                  ) : (<View />)}
                </View>

                {/* Content Area - Show loading, welcome, or messages */}
                {shouldShowLoading && loadingContent}

                {shouldShowWelcome && welcomeContent}

                {shouldShowMessages && (
                  <>
                    <FlatList
                      ref={realtimeActions.flatListRef}
                      data={realtimeActions.messages}
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
                      extraData={realtimeActions.messages.length}
                    />
                    {!realtimeActions.isTyping &&
                      <ScrollToBottomButton
                        onPress={realtimeActions.scrollToBottom}
                        visible={showScrollButton}
                      />
                    }
                  </>
                )}
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
                message={realtimeActions.message}
                setMessage={realtimeActions.setMessage}
                isEdited={isEdited}
                isRecording={realtimeActions.isRecording}
                setIsRecording={realtimeActions.setIsRecording}
                onSendMessage={realtimeActions.handleSendMessage}
                onStopMessage={handleStopMessage}
                isSending={isSending || realtimeActions.isTyping}
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
                  Platform.OS === "android" && { paddingTop: statusBarHeight + 10 }
                ]}>
                  <TouchableOpacity onPress={handleToggleSidebar}>
                    <Image
                      source={require('@/src/assets/images/menu.png')}
                      style={styles.menuIcon}
                    />
                  </TouchableOpacity>

                  <Text style={styles.headerTitle}>NeuroVision</Text>
                  {realtimeActions.messages.length !== 0 ? (
                    <TouchableOpacity onPress={realtimeActions.startNewConversation}>
                      <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                    </TouchableOpacity>
                  ) : (<View />)}
                </View>

                {/* Content Area - Show loading, welcome, or messages */}
                {shouldShowLoading && loadingContent}

                {shouldShowWelcome && welcomeContent}

                {shouldShowMessages && (
                  <>
                    <FlatList
                      ref={realtimeActions.flatListRef}
                      data={realtimeActions.messages}
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
                      extraData={realtimeActions.messages.length}
                    />
                    {!realtimeActions.isTyping &&
                      <ScrollToBottomButton
                        onPress={realtimeActions.scrollToBottom}
                        visible={showScrollButton}
                      />
                    }
                  </>
                )}
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
                message={realtimeActions.message}
                setMessage={realtimeActions.setMessage}
                isEdited={isEdited}
                isRecording={realtimeActions.isRecording}
                setIsRecording={realtimeActions.setIsRecording}
                onSendMessage={realtimeActions.handleSendMessage}
                onStopMessage={handleStopMessage}
                isSending={isSending || realtimeActions.isTyping}
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
      {state.openBottomSheet && (
        <BottomSheetModal
          onFileSelected={(file) => handleFileSelected(file)}
          bottomSheetRef={state.bottomSheetRef}
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
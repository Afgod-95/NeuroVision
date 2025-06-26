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
  FlatList
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
import { UploadedAudioFile as OriginalUploadedAudioFile } from '@/src/components/chatUI/ChatInput';
import { uniqueConvId } from '@/src/constants/generateConversationId';
import useRealtimeChat from '@/src/hooks/chats/RealtimeChats';
import Loading from '@/src/components/Loaders/Loading';
import ScrollToBottomButton from '@/src/components/chatUI/ScrollToBottomButton';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { setOptions } from 'expo-splash-screen';
import SpeechBanner from '@/src/components/chatUI/AudioBanner';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

// Extend UploadedAudioFile to include duration
type UploadedAudioFile = OriginalUploadedAudioFile & {
  duration?: number;
};

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
  const { user: userCredentials } = useSelector((state: RootState) => state.user);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const { conversation_id } = useLocalSearchParams();
  console.log(`Conversation ID: ${conversation_id}`);

  // Speech Banner State
  const [speechBanner, setSpeechBanner] = useState({
    visible: false,
    audioUrl: '',
    message: '',
    isGenerating: false
  });

  const queryClient = useQueryClient();

  // Get the actual conversation ID
  const actualConversationId = Array.isArray(conversation_id) ? conversation_id[0] : conversation_id;

  // Initialize the realtime chat hook
  const {
    // State
    messages,
    loading,
    isAIResponding,
    isRecording,
    message,
    isSidebarVisible,
    conversationId,
    username,

    // Actions
    handleSendMessage,
    handleRegenerate,
    handleEditMessageCallback,
    startNewConversation,
    loadConversationHistory,
    setMessage,
    setMessages,
    setIsRecording,
    setIsSidebarVisible,
    scrollToBottom,

    // Refs
    flatListRef,

    // Mutation
    sendMessageMutation,
  } = useRealtimeChat({
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

  // Fixed generateTextToSpeech function
const generateTextToSpeech = async (text: string) => {
  try {
    const response = await axios.post('/api/conversations/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text
      })
    });

    if (!response.data) {
      throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
    }

    // Get the audio data as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileUri = `${FileSystem.documentDirectory}tts_audio_${timestamp}.mp3`;
    
    // Write the audio file
    await FileSystem.writeAsStringAsync(
      fileUri,
      Buffer.from(uint8Array).toString('base64'),
      { encoding: FileSystem.EncodingType.Base64 }
    );

    console.log('Audio file saved to:', fileUri);
    
    // Return the file URI
    return { audioUrl: fileUri };
    
  } catch (error) {
    console.error('TTS Generation Error:', error);
    throw error; 
  }
};

// Updated speechHandler function with better error handling
const speechHandler = useCallback(async (text: string) => {
  if (!text.trim()) {
    console.log('No text provided for speech synthesis');
    return;
  }

  try {
    setSpeechBanner(prev => ({ ...prev, isGenerating: true }));
    
    const response = await generateTextToSpeech(text);
    
    if (response.audioUrl) {
      setSpeechBanner({
        visible: true,
        audioUrl: response.audioUrl,
        message: text.length > 100 ? text.substring(0, 100) + '...' : text,
        isGenerating: false
      });
    }
  } catch (error) {
    console.error('Error generating speech:', error);
    setSpeechBanner(prev => ({ ...prev, isGenerating: false }));
    setSpeechBanner({
      visible: false,
      audioUrl: '',
      message: '',
      isGenerating: false
    });
  }
}, []);

// Enhanced speech banner close handler to clean up files
const handleSpeechBannerClose = useCallback(async () => {
  setSpeechBanner(prev => {
    // Cleanup local audio file
    if (prev.audioUrl && prev.audioUrl.startsWith('file://')) {
      FileSystem.deleteAsync(prev.audioUrl, { idempotent: true })
        .catch(error => console.warn('Failed to delete audio file:', error));
    }
    
    // Cleanup blob URL if it exists
    if (prev.audioUrl && prev.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prev.audioUrl);
    }
    
    return {
      visible: false,
      audioUrl: '',
      message: '',
      isGenerating: false
    };
  });
}, []);

// Add this cleanup effect to your useEffect
useEffect(() => {
  return () => {
    console.log('Cleaning up chat component');
    
    // Cleanup any local audio files
    if (speechBanner.audioUrl && speechBanner.audioUrl.startsWith('file://')) {
      FileSystem.deleteAsync(speechBanner.audioUrl, { idempotent: true })
        .catch(error => console.warn('Failed to delete audio file:', error));
    }
    
    // Cleanup blob URLs
    if (speechBanner.audioUrl && speechBanner.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(speechBanner.audioUrl);
    }
  };
}, [conversationId, speechBanner.audioUrl]);

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
        setMessages(transformedMessages);
        scrollToBottom()
      }
    } catch (error) {
      console.error('Error prefetching messages:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [queryClient, transformApiMessages, setMessages]);

  // Effect to prefetch messages when conversation_id is available
  useEffect(() => {
    if (actualConversationId && userCredentials?.id) {
      console.log('Triggering prefetch for:', actualConversationId);
      prefetchMessages(
        actualConversationId,
        String(userCredentials.id)
      );
    }
  }, [actualConversationId, userCredentials?.id, prefetchMessages]);
  
  /**
   * scroll to bottom
   */
  const onScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    const isAtBottom = offsetY + layoutHeight >= contentHeight;

    setShowScrollButton(!isAtBottom && offsetY > 50);
  }, []);

  // Sidebar handlers
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarVisible(!isSidebarVisible);
  }, [isSidebarVisible, setIsSidebarVisible]);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, [setIsSidebarVisible]);

  const handleOpenSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, [setIsSidebarVisible]);

  // Message input handlers
  const handleMessageOnChange = useCallback((text: string) => {
    setMessage(text);
  }, [setMessage]);

  const handleIsRecording = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, [setIsRecording]);

  // Handle send message with proper typing
  const handleSendMessageWithAudio = useCallback((messageText: string, audioFile?: UploadedAudioFile) => {
    handleSendMessage(messageText, audioFile);
  }, [handleSendMessage]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // SINGLE renderItem function - Remove all other render functions
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
      const isLastMessage = index === messages.length - 1;
      const shouldShowLoading = isLastMessage &&
        isAIResponding &&
        (item.text.trim() === '' || item.isLoading === true);

      // Force loading to false if AI is not responding
      const finalLoadingState = isAIResponding ? shouldShowLoading : false;

      return (
        <MemoizedAdvancedAIResponse
          message={item.text}
          loading={finalLoadingState}
          onRegenerate={() => handleRegenerate(item.id)}
          disableReadAloud={speechBanner.isGenerating}
          openReadAloud={() => speechHandler(item.text)}
        />
      );
    }
  }, [handleRegenerate, isAIResponding, messages.length, speechBanner.isGenerating, speechHandler]);

  // Add debug logging to track loading state changes
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('Loading State Debug:', {
        messageId: lastMessage.id,
        messageText: lastMessage.text.substring(0, 30) + '...',
        messageIsLoading: lastMessage.isLoading,
        globalIsAIResponding: isAIResponding,
        globalLoading: loading,
        initialLoading: isInitialLoading,
      });
    }
  }, [messages, isAIResponding, loading, isInitialLoading]);

  // Add a cleanup effect when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      console.log('Cleaning up chat component');
      // Cleanup any blob URLs
      if (speechBanner.audioUrl && speechBanner.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(speechBanner.audioUrl);
      }
    };
  }, [conversationId, speechBanner.audioUrl]);

  const keyExtractor = useCallback((item: Message) => {
    // Ensure unique keys - add sender info to make it more unique
    return `${item.id}-${item.sender}-${item.user ? 'user' : 'ai'}`;
  }, []);

  // Memoized welcome content to prevent re-renders
  const welcomeContent = useMemo(() => (
    <View style={styles.contentArea}>
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>
          Hello {username} 👋{'\n'}
          <Text style={styles.boldText}>I&apos;m NeuroVision, your AI assistant.</Text>
        </Text>
        <Text style={styles.subText}>
          How may I help you today?
        </Text>
      </View>
    </View>
  ), [username]);

  const loadingContent = useMemo(() => (
    <Loading />
  ), []);

  // Determine what to show based on loading states
  const shouldShowLoading = loading || isInitialLoading;
  const shouldShowWelcome = !shouldShowLoading && messages.length === 0;
  const shouldShowMessages = !shouldShowLoading && messages.length > 0;

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Background Image */}
          <Image
            source={require('@/src/assets/images/CircularGradient.png')}
            style={styles.backgroundImage}
          />

          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <SafeAreaView style={styles.safeAreaContainer}>
              {/* Speech Banner - Positioned at the top */}
              <SpeechBanner
                audioUrl={speechBanner.audioUrl}
                message={speechBanner.message}
                visible={speechBanner.visible}
                autoDismiss={true}
                onClose={handleSpeechBannerClose}
              />

              {/* Header - Fixed at top */}
              <View style={[styles.header, speechBanner.visible && styles.headerWithBanner]}>
                <TouchableOpacity onPress={handleToggleSidebar}>
                  <Image
                    source={require('@/src/assets/images/menu.png')}
                    style={styles.menuIcon}
                  />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>NeuroVision</Text>

                {/* Optional: Add new conversation button */}
                <TouchableOpacity onPress={startNewConversation}>
                  <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                </TouchableOpacity>
              </View>

              {/* Content Area - Show loading, welcome, or messages */}
              {shouldShowLoading && loadingContent}

              {shouldShowWelcome && welcomeContent}

              {shouldShowMessages && (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={[
                      styles.flatListContent,
                      speechBanner.visible && styles.flatListContentWithBanner
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
                    extraData={messages.length}
                  />
                  <ScrollToBottomButton
                    onPress={scrollToBottom}
                    visible={showScrollButton}
                  />
                </>
              )}
            </SafeAreaView>

            {/* USER MESSAGE PREVIEW */}
            <MessagePreview
              message={messageId ?? ''}
              messageId={messageId ?? ''}
              userMessage={true}
              editMessage={handleEditMessageCallback}
            />

            {/* Chat input */}
            <ChatInput
              message={message}
              setMessage={handleMessageOnChange}
              isRecording={isRecording}
              setIsRecording={handleIsRecording}
              isEdited={isEdited}
              onSendMessage={handleSendMessageWithAudio}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <CustomSideBar
        isVisible={isSidebarVisible}
        onClose={handleCloseSidebar}
        onOpen={handleOpenSidebar}
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
    height: 60,
    paddingTop: Platform.OS === 'android' ? 20 : undefined,
    zIndex: 1000, // Lower than speech banner
  },
  headerWithBanner: {
    marginTop: 8, // Add some space when banner is visible
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
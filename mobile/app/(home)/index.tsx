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
import CustomSideBar from '@/src/components/chatUI/CustomSideBar';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import UserMessageBox, { MessagePreview, MessageContent } from '@/src/components/chatUI/UserMessageBox';
import AdvancedAIResponse from '@/src/components/chatUI/AIResponse';
import { UploadedAudioFile as OriginalUploadedAudioFile } from '@/src/components/chatUI/ChatInput';
import { uniqueConvId } from '@/src/constants/generateConversationId';
import useRealtimeChat from '@/src/hooks/chats/RealtimeChats';
import Loading from '@/src/components/Loaders/Loading';
import { useFetchMessagesMutation } from '@/src/hooks/conversations/GetConversationsMutation';

// Extend UploadedAudioFile to include duration
type UploadedAudioFile = OriginalUploadedAudioFile & {
  duration?: number;
};

// Enhanced message types to include content and match database schema
interface Message {
  id: string;
  conversation_id?: string;
  user_id?: string; 
  sender: 'user' | 'assistant' | 'system';
  text: string;
  content?: MessageContent;
  created_at: string;
  timestamp?: string;
  user: boolean;
  isLoading?: boolean;
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

  useEffect(() => {
    loadConversationHistory()
  },[loadConversationHistory])


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
        />
      );
    }
  }, [handleRegenerate, isAIResponding, messages.length]);

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
      });
    }
  }, [messages, isAIResponding, loading]);

  // Add a cleanup effect when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      console.log('Cleaning up chat component');
    };
  }, [conversationId]);

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
              {/* Header - Fixed at top */}
              <View style={styles.header}>
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

              {/* Content Area - Show welcome or messages */}
              {loading ? loadingContent : (
                messages.length === 0 ? welcomeContent : (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.flatListContent}
                    // Performance optimizations
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={10}
                    windowSize={10}
                    decelerationRate="normal"
                    scrollEventThrottle={16}
                    // onContentSizeChange={onContentSizeChangeCallback}
                    // Prevent unnecessary re-renders
                    getItemLayout={undefined}
                    // Add these props to help with duplicate prevention
                    extraData={messages.length} // Forces re-render only when length changes
                  />
                )
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
    fontSize: 20,
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
    paddingBottom: 100,
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
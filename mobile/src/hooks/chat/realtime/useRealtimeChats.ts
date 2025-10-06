import { useEffect, useCallback } from "react";
import { RealtimeChatProps } from "@/src/utils/interfaces/TypescriptInterfaces";
import { useRealtimeChatState } from "../states/useRealtimeChatStates";
import { useMessageUtils } from "../utils/useMessageUtils";
import { useTypingAnimation } from "../animations/useTypingAnimation";
import { useAIResponseManager } from "../ai/useAIResponseManager";
import { useMessageMutation } from "../mutations/useMessageMutation";
import { useSupabaseRealtime } from "../supabase/useSupabaseRealtime";
import { useConversationActions } from "../actions/useConversationActions";
import { useMessageOptions } from "@/src/hooks/userMessagePreview/useMessageOptions";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { setConversationId } from "@/src/redux/slices/chatSlice";
import { setMessage as setMessageOptions } from "@/src/redux/slices/messageOptionsSlice";

export const useRealtimeChat = ({
  uniqueConvId,
  systemPrompt = "You are a helpful AI Assistant",
  temperature = 0.7,
  maxTokens = 1048576,
  onMessagesChange,
  onLoadingChange,
}: RealtimeChatProps) => {
  const chatState = useRealtimeChatState();
  const dispatch = useDispatch<AppDispatch>();
  const { messages, message  } = useSelector((state: RootState) => state.chat);
  const { isEdited, messageId } = useSelector((state: RootState) => state.messageOptions);

  // Helpers
  const { transformSupabaseMessage, extractAIResponseText, 
    scrollToBottom } = useMessageUtils(chatState.flatListRef);
  
    // Initialize typing animation FIRST (without clearAIResponding for now)
  const { startTypingAnimation, cleanupTypingAnimation } = useTypingAnimation({
    ...chatState
  });
  
  
  // Initialize AI response manager
  const { clearAIResponding } = useAIResponseManager({
    isProcessingResponseRef: chatState.isProcessingResponseRef,
    currentLoadingIdRef: chatState.currentLoadingIdRef,
    abortControllerRef: chatState.abortControllerRef,
    cleanupTypingAnimation,
  });

  // Supabase realtime subscription
  const { cleanupSubscription } = useSupabaseRealtime({
    ...chatState,
    transformSupabaseMessage,
    startTypingAnimation,
    clearAIResponding,
    scrollToBottom,
    cleanupTypingAnimation,
  });

  

  // Send message mutation
  const { sendMessageMutation } = useMessageMutation({
    systemPrompt,
    temperature,
    maxTokens,
    ...chatState,
    startTypingAnimation,
    clearAIResponding,
    extractAIResponseText,
    scrollToBottom,
  });

  // Actions
  const {
    handleSendMessage,
    abortMessage,
    handleRegenerate,
    startNewConversation,
    loadConversationHistory,
  } = useConversationActions({
    systemPrompt,
    temperature,
    maxTokens,
    ...chatState,
    scrollToBottom,
    cleanupSubscription,
    clearAIResponding,
    sendMessageMutation,
    cleanupTypingAnimation,
    startTypingAnimation,
    extractAIResponseText,
    queryClient: chatState.queryClient,
  });

  // Initialize conversationId once
  useEffect(() => {
    if (chatState.userDetails?.id && uniqueConvId && !chatState.conversationId) {
      dispatch(setConversationId(uniqueConvId));
    }
  }, [
    dispatch, 
    chatState.conversationId, 
    chatState.userDetails?.id, 
    uniqueConvId,
  ]);

  // Auto-load message into input when editing
  useEffect(() => {
    if (isEdited && messageId) {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) dispatch(setMessageOptions(msg.text));
    }
  }, [dispatch, messages, isEdited, messageId]);

  // Message options
  const { handleEditMessage } = useMessageOptions();
  const handleEditMessageCallback = useCallback(() => {
    handleEditMessage(message);
  }, [handleEditMessage, message]);

  // External listeners
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(chatState.isAIResponding);
    }
  }, [chatState.isAIResponding, onLoadingChange]);

  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(chatState.messages);
    }
  }, [chatState.messages, onMessagesChange]);

  return {
    // State
    messages: chatState.messages,
    loading: chatState.loading,
    newChat: chatState.newChat,
    isAIResponding: chatState.isAIResponding,
    isRecording: chatState.isRecording,
    message: chatState.message,
    isTyping: chatState.isTyping,
    isSidebarVisible: chatState.isSidebarVisible,
    conversationId: chatState.conversationId,
    username: chatState.username,
    isAborted: chatState.isAborted,
    showAIButtonAction: chatState.showAIButtonAction,
    attachments: chatState.attachments,
    openBottomSheet: chatState.openBottomSheet,
    userDetails: chatState.userDetails,
    accessToken: chatState.accessToken,
    refreshToken: chatState.refreshToken,
    messageId: chatState.messageId,
    isEdited: chatState.isEdited,

    // Actions
    handleSendMessage,
    abortMessage,
    handleRegenerate,
    handleEditMessageCallback,
    startNewConversation,
    loadConversationHistory,

    // State setters
    setMessages: chatState.setMessages,
    setIsRecording: chatState.setIsRecording,
    setIsSidebarVisible: chatState.setIsSidebarVisible,
    setNewChat: chatState.setNewChat,
    setIsAIResponding: chatState.setIsAIResponding,
    setLoading: chatState.setLoading,
    setIsTyping: chatState.setIsTyping,
    setIsAborted: chatState.setIsAborted,
    setShowAIButtonAction: chatState.setShowAIButtonAction,
    setConversationId: chatState.setConversationId,
    addMessage: chatState.addMessage,
    updateMessage: chatState.updateMessage,
    removeMessage: chatState.removeMessage,
    setAttachments: chatState.setAttachments,
    addAttachment: chatState.addAttachment,
    removeAttachment: chatState.removeAttachment,
    setOpenBottomSheet: chatState.setOpenBottomSheet,
    setSidebarVisible: chatState.setIsSidebarVisible,


    // Utils
    scrollToBottom,
    extractAIResponseText,
    clearAIResponding,
    cleanupTypingAnimation,
    startTypingAnimation,

    // Refs
    flatListRef: chatState.flatListRef,
    bottomSheetRef: chatState.bottomSheetRef,
    isProcessingResponseRef: chatState.isProcessingResponseRef,
    currentLoadingIdRef: chatState.currentLoadingIdRef,
    abortControllerRef: chatState.abortControllerRef,
    typingIntervalRef: chatState.typingIntervalRef,
    typingTimeoutRef: chatState.typingTimeoutRef,
    currentTypingMessageIdRef: chatState.currentTypingMessageIdRef,
    realtimeChannelRef: chatState.realtimeChannelRef,
    pendingUserMessageRef: chatState.pendingUserMessageRef,
    processedMessageIds: chatState.processedMessageIds,
    subscriptionReadyRef: chatState.subscriptionReadyRef,
    isSubscriptionActiveRef: chatState.isSubscriptionActiveRef,
    subscribedConversationIdRef: chatState.subscribedConversationIdRef,

    // Services
    sendMessageMutation,
    queryClient: chatState.queryClient,
  };
};




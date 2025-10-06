import { useRef, useMemo } from 'react'
import { FlatList } from 'react-native';
import { Message } from '@/src/utils/interfaces/TypescriptInterfaces';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/src/redux/store';
import {
  setSidebarVisible,
  setMessage,
  setIsRecording,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  setIsAIResponding,
  setConversationId,
  setLoading,
  setIsTyping,
  setIsAborted,
  setShowAIButtonAction,
  setOpenBottomSheet,
  setAttachments,
  addAttachment,
  removeAttachment,
  setNewChat,
} from '@/src/redux/slices/chatSlice';
import BottomSheet from '@gorhom/bottom-sheet';

// Redux-compatible state management hook
export const useRealtimeChatState = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get state from Redux instead of local useState
  const chatState = useSelector((state: RootState) => state.chat);
  const { user: userDetails, accessToken, refreshToken } = useSelector((state: RootState) => state.auth);
  const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);

  // Keep refs as local since they don't need to be in Redux
  const realtimeChannelRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const pendingUserMessageRef = useRef<string | null>(null);
  const isProcessingResponseRef = useRef<boolean>(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const currentLoadingIdRef = useRef<string | null>(null);
  const subscriptionReadyRef = useRef<boolean>(false);
  const isSubscriptionActiveRef = useRef<boolean>(false);
  const subscribedConversationIdRef = useRef<string | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const currentTypingMessageIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const queryClient = useQueryClient();

  const username = useMemo(() => {
    const getDisplayName = (username?: string) => {
      if (!username) return "";
      const parts = username.trim().split(" ").filter(Boolean);
      if (parts.length === 1) {
        return parts[0]; 
      }
      if (parts.length === 2) {
        return parts[0];
      }
      return parts[parts.length - 1]; 
    };
    return getDisplayName(userDetails?.username); 
  }, [userDetails?.username]);

  // Redux-compatible setter functions
  const setIsSidebarVisible = (value: boolean) => dispatch(setSidebarVisible(value));
  const setMessageText = (value: string) => dispatch(setMessage(value));
  const setIsRecordingState = (value: boolean) => dispatch(setIsRecording(value));
  const setMessagesArray = (value: Message[]) => dispatch(setMessages(value));
  const setIsAIRespondingState = (value: boolean) => dispatch(setIsAIResponding(value));
  const setConversationIdValue = (value: string) => dispatch(setConversationId(value));
  const setLoadingState = (value: boolean) => dispatch(setLoading(value));
  const setIsTypingState = (value: boolean) => dispatch(setIsTyping(value));
  const setIsAbortedState = (value: boolean) => dispatch(setIsAborted(value));
  const setShowAIButtonActionState = (value: boolean) => dispatch(setShowAIButtonAction(value));
  const setOpenBottomSheetState = (value: boolean) => dispatch(setOpenBottomSheet(value));
  const setAttachmentsArray = (value: any[]) => dispatch(setAttachments(value));
  const setNewChatState = (value: boolean) => dispatch(setNewChat(value));

  // Message management functions
  const addMessageToState = (message: Message) => dispatch(addMessage(message));
  const updateMessageInState = (id: string, updates: Partial<Message>) => 
    dispatch(updateMessage({ id, updates }));
  const removeMessageFromState = (id: string) => dispatch(removeMessage(id));

  // Attachment management functions
  const addAttachmentToState = (attachment: any) => dispatch(addAttachment(attachment));
  const removeAttachmentFromState = (index: number) => dispatch(removeAttachment(index));

  return {
    // Redux State (read-only, use setters to update)
    isSidebarVisible: chatState.isSidebarVisible,
    message: chatState.message,
    isRecording: chatState.isRecording,
    messages: chatState.messages,
    isAIResponding: chatState.isAIResponding,
    conversationId: chatState.conversationId,
    loading: chatState.loading,
    isTyping: chatState.isTyping,
    isAborted: chatState.isAborted,
    showAIButtonAction: chatState.showAIButtonAction,
    openBottomSheet: chatState.openBottomSheet,
    attachments: chatState.attachments,
    newChat: chatState.newChat,

    // Redux Setters
    setIsSidebarVisible,
    setMessage: setMessageText,
    setIsRecording: setIsRecordingState,
    setMessages: setMessagesArray,
    setIsAIResponding: setIsAIRespondingState,
    setConversationId: setConversationIdValue,
    setLoading: setLoadingState,
    setIsTyping: setIsTypingState,
    setIsAborted: setIsAbortedState,
    setShowAIButtonAction: setShowAIButtonActionState,
    setOpenBottomSheet: setOpenBottomSheetState,
    setAttachments: setAttachmentsArray,
    setNewChat: setNewChatState,

    // Message Management
    addMessage: addMessageToState,
    updateMessage: updateMessageInState,
    removeMessage: removeMessageFromState,

    // Attachment Management
    addAttachment: addAttachmentToState,
    removeAttachment: removeAttachmentFromState,

    // Auth & User Data
    accessToken,
    refreshToken,
    userDetails,
    username,
    messageId,
    isEdited,

    // Other utilities
    queryClient,
    bottomSheetRef,

    // Refs (these stay the same)
    realtimeChannelRef,
    flatListRef,
    pendingUserMessageRef,
    isProcessingResponseRef,
    processedMessageIds,
    currentLoadingIdRef,
    subscriptionReadyRef,
    isSubscriptionActiveRef,
    subscribedConversationIdRef,
    typingIntervalRef,
    typingTimeoutRef,
    currentTypingMessageIdRef,
    abortControllerRef,
  };
};
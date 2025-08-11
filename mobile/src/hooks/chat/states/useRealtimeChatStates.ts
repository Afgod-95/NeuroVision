import { useState, useRef, useMemo } from 'react'
import { FlatList } from 'react-native';
import { Message } from '@/src/utils/interfaces/TypescriptInterfaces';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import BottomSheet from '@gorhom/bottom-sheet';
// Manages all state variables and basic state operations
export const useRealtimeChatState = () => {
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAIResponding, setIsAIResponding] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isAborted, setIsAborted] = useState<boolean>(false);
  const [showAIButtons, setShowAIButtons] = useState<boolean>(false);

  const [newChat, setNewChat] = useState<boolean>(false);
  //bottomsheet states 
  const [openBottomSheet, setOpenBottomSheet] = useState<boolean>(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  //files upload state 
  const [attachments, setAttachments] = useState<any[]>([]);
 


  // All refs
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


   const { user: userDetails } = useSelector((state: RootState) => state.user);
    const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);
    const queryClient = useQueryClient();

    const username = useMemo(() => userDetails?.username?.split(" ")[0], [userDetails?.username]);
  return {
    // State
    isSidebarVisible, setIsSidebarVisible,
    message, setMessage,
    isRecording, setIsRecording,
    messages, setMessages,
    isAIResponding, setIsAIResponding,
    conversationId, setConversationId,
    loading, setLoading,
    isTyping, setIsTyping,
    isAborted, setIsAborted,
    showAIButtons, setShowAIButtons,
    openBottomSheet, setOpenBottomSheet,
    attachments, setAttachments,
    newChat, setNewChat,

    //bottomsheet states 
    bottomSheetRef,

    //user
    userDetails,
    username,
    queryClient,
    messageId, isEdited, 
    
    // Refs
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
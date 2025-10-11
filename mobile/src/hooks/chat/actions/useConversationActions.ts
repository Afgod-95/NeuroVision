import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import {
  setMessage,
  setMessages,
  setAttachments,
  setIsAborted,
  setShowAIButtonAction,
  setConversationId,
  setLoading,
  setIsAIResponding,
  setNewChat,
  addMessage,
  updateMessage,
  removeMessage,
} from "@/src/redux/slices/chatSlice";

import { Message, UploadedAudioFile, UploadedFile } from "@/src/utils/interfaces/TypescriptInterfaces";
import { useConversationMutation } from "../mutations/useConversationMutation";
import { uniqueConvId as startNewConversationId } from "@/src/constants/generateConversationId";
import api from "@/src/services/axiosClient";
import { QueryClient, UseMutationResult } from "@tanstack/react-query";
import { base64ToBlob } from "@/src/utils/helpers/base64ToBlob";

type UseConversationActionsProps = {
  userDetails: any;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;

  // refs
  abortControllerRef: React.RefObject<AbortController | null>;
  queryClient: QueryClient;
  isProcessingResponseRef: React.RefObject<boolean>;
  pendingUserMessageRef: React.RefObject<string | null>;
  currentLoadingIdRef: React.RefObject<string | null>;
  processedMessageIds: React.RefObject<Set<string>>;

  // utils
  clearAIResponding: () => void;
  sendMessageMutation: UseMutationResult<any, unknown, any, unknown>;
  cleanupSubscription: () => void;
  cleanupTypingAnimation: () => void;
  extractAIResponseText: (data: any) => any;
  startTypingAnimation: (aiResponseText: string, fallbackMessageId: string) => void;
  scrollToBottom: () => void;
};

export const useConversationActions = ({
  userDetails,
  systemPrompt,
  temperature,
  maxTokens,
  abortControllerRef,
  queryClient,
  isProcessingResponseRef,
  pendingUserMessageRef,
  currentLoadingIdRef,
  processedMessageIds,
  clearAIResponding,
  sendMessageMutation,
  cleanupSubscription,
  cleanupTypingAnimation,
  extractAIResponseText,
  startTypingAnimation,
  scrollToBottom,
}: UseConversationActionsProps) => {
  const dispatch = useDispatch();
  const { messages, conversationId } = useSelector(
    (state: RootState) => state.chat
  );
  const { accessToken } = useSelector((state: RootState) => state.auth);

  // ===================== SEND MESSAGE WITH FILES SUPPORT =====================
  const handleSendMessage = useCallback(
    async (
      messageText: string, 
      audioFile?: UploadedAudioFile,
      files?: UploadedFile[]
    ) => {
      // Check if there's content to send
      const hasText = messageText.trim();
      const hasAudio = !!audioFile;
      const hasFiles = files && files.length > 0;

      if (!hasText && !hasAudio && !hasFiles) {
        console.log("⚠️ No message, audio, or files to send");
        return;
      }
      
      if (isProcessingResponseRef.current) {
        console.log("⚠️ Already processing a response, ignoring request");
        return;
      }

      console.log("📤 Sending message:", {
        text: messageText,
        hasAudio,
        filesCount: files?.length || 0,
        fileNames: files?.map(f => f.name)
      });

      dispatch(setMessage(""));
      dispatch(setAttachments([]));
      dispatch(setIsAborted(false));

      // Pass all parameters to the mutation
      sendMessageMutation.mutate({ 
        messageText, 
        audioFile,
        files
      });
    },
    [sendMessageMutation, isProcessingResponseRef, dispatch]
  );

  // ===================== START NEW CONVERSATION =====================
  const startNewConversation = useCallback(() => {
    console.log("🆕 Starting new conversation");
    const newConvId = startNewConversationId;

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      console.log("⚠️ Aborting in-flight request for new conversation");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    cleanupSubscription();
    cleanupTypingAnimation();

    dispatch(setConversationId(newConvId));
    dispatch(setMessages([]));
    dispatch(setNewChat(true));

    pendingUserMessageRef.current = null;
    currentLoadingIdRef.current = null;
    processedMessageIds.current.clear();
    isProcessingResponseRef.current = false;

    clearAIResponding();
    dispatch(setIsAborted(false));
    dispatch(setLoading(false));
  }, [
    cleanupSubscription,
    cleanupTypingAnimation,
    dispatch,
    pendingUserMessageRef,
    currentLoadingIdRef,
    processedMessageIds,
    clearAIResponding,
    abortControllerRef,
    isProcessingResponseRef,
  ]);

  // ===================== LOAD HISTORY =====================
  const { useFetchMessagesMutation } = useConversationMutation(accessToken as string);
  const loadConversationHistoryMutation = useFetchMessagesMutation();

  const loadConversationHistory = useCallback(async () => {
    try {
      console.log("📜 Loading conversation history");
      dispatch(setLoading(true));
      dispatch(setIsAborted(false));

      const response = await loadConversationHistoryMutation.mutateAsync(userDetails?.id);
      const extractedMessages =
        response.history?.map((item: { content: string; role: string }) => ({
          content: item.content,
          role: item.role,
        })) ?? [];

      console.log(`✅ Loaded ${extractedMessages.length} messages`);
    } catch (error) {
      console.error("❌ Failed to load conversation history:", error);
    } finally {
      dispatch(setLoading(false));
    }
  }, [userDetails?.id, dispatch, loadConversationHistoryMutation]);

  // ===================== HANDLE REGENERATE WITH FILE SUPPORT =====================
  const handleRegenerate = useCallback(async (messageId: string) => {
  if (isProcessingResponseRef.current) {
    console.log('⚠️ Already processing a response, ignoring regenerate request');
    return;
  }

  console.log("🔄 Regenerating message:", messageId);
  dispatch(setIsAborted(false));

  // Find the message being regenerated and the previous user message
  const currentIndex = messages.findIndex(msg => msg.id === messageId);
  if (currentIndex === -1) {
    console.log("❌ Message not found:", messageId);
    return;
  }

  const previousUserMessage = messages.slice(0, currentIndex).reverse().find(msg => msg.user);

  if (!previousUserMessage) {
    console.log("❌ No previous user message found");
    return;
  }

  isProcessingResponseRef.current = true;

  // ✅ REMOVE THE OLD AI MESSAGE FIRST
  console.log("🗑️ Removing old AI message:", messageId);
  dispatch(removeMessage(messageId));

  // Create loading message
  const loadingMessageId = `loading-regenerate-${Date.now()}`;
  const loadingMessage: Message = {
    id: loadingMessageId,
    text: '',
    user: false,
    created_at: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    sender: 'assistant',
    isLoading: true
  };

  currentLoadingIdRef.current = loadingMessageId;
  dispatch(addMessage(loadingMessage));
  dispatch(setIsAIResponding(true));
  
  setTimeout(scrollToBottom, 50);

  try {
    // Create abort controller for regenerate request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // ✅ Check if the original message has files with full data
    const hasFilesWithData = previousUserMessage.content?.files && 
      previousUserMessage.content.files.length > 0 &&
      previousUserMessage.content.files.some((f: any) => f.base64 || f.uri);

    let response;

    if (hasFilesWithData) {
      // ✅ USE FORMDATA FOR MESSAGES WITH FILES
      console.log("📎 Regenerating message with files:", previousUserMessage?.content?.files?.length);
      
      const formData = new FormData();
      formData.append('message', previousUserMessage.text);
      formData.append('useDatabase', 'true');
      formData.append('temperature', temperature.toString());
      formData.append('maxTokens', maxTokens.toString());
      formData.append('systemPrompt', systemPrompt);
      
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      // Add conversation history (exclude the message being regenerated)
      const conversationHistory = messages
        .filter(msg => msg.id !== messageId) // Exclude the old AI response
        .slice(-10)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
      formData.append('conversationHistory', JSON.stringify(conversationHistory));

      // ✅ FIXED: Add files with their full data
      const files = previousUserMessage.content!.files!;
      for (const file of files) {
        if ((file as any).base64) {
          // Convert base64 to blob
          const blob = base64ToBlob((file as any).base64, file.type || 'application/octet-stream');
          formData.append('files', blob, file.name || `file_${Date.now()}`);
        } else if ((file as any).uri) {
          // For URIs, we need to fetch the file first (if it's a local file)
          // or send the URI directly if the backend supports it
          const fileData: any = {
            uri: (file as any).uri,
            type: file.type || 'application/octet-stream',
            name: file.name || `file_${Date.now()}`,
          };
          // Note: This assumes your backend can handle URI objects
          // If not, you'll need to fetch and convert to blob first
          formData.append('files', JSON.stringify(fileData));
        }
      }

      response = await api.post(
        '/api/conversations/send-message',
        formData,
        {
          signal: controller.signal,
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000,
        }
      );

    } else {
      // ✅ USE JSON FOR TEXT-ONLY MESSAGES
      console.log("📝 Regenerating text-only message");
      
      const payload = {
        message: previousUserMessage.text,
        messageContent: previousUserMessage.content,
        systemPrompt: systemPrompt,
        temperature: temperature,
        maxTokens: maxTokens,
        conversationId: conversationId,
        userDetails: userDetails,
        useDatabase: true,
      };

      response = await api.post('/api/conversations/send-message', payload, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 60000,
      });
    }

    abortControllerRef.current = null;
    isProcessingResponseRef.current = false;

    const aiResponseText = extractAIResponseText(response.data);

    if (!aiResponseText || aiResponseText.trim() === '') {
      throw new Error('AI response is empty or invalid');
    }

    console.log("✅ Regenerated response received");

    // ✅ Remove loading message and add typing message
    if (currentLoadingIdRef.current === loadingMessageId) {
      dispatch(removeMessage(loadingMessageId));
      
      // Small delay to ensure removal completes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Create new typing message
      const typingMessageId = `typing-regenerate-${Date.now()}`;
      const typingMessage: Message = {
        id: typingMessageId,
        text: '',
        user: false,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        sender: 'assistant',
        isTyping: true,
      };
      
      dispatch(addMessage(typingMessage));
      currentLoadingIdRef.current = typingMessageId;

      setTimeout(() => {
        startTypingAnimation(aiResponseText, typingMessageId);
      }, 100);
    }

  } catch (error: any) {
    
    abortControllerRef.current = null;
    isProcessingResponseRef.current = false;

    // Don't show error for canceled requests
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      console.log("⚠️ Regeneration was canceled");
      
      // Remove loading message on cancel
      if (currentLoadingIdRef.current) {
        dispatch(removeMessage(currentLoadingIdRef.current));
      }
      
      clearAIResponding();
      currentLoadingIdRef.current = null;
      return;
    }

    let errorText = 'Failed to regenerate response. Please try again.';

    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        errorText = 'You are not authorized. Please log in again.';
      } else if (status === 403) {
        errorText = 'Access denied.';
      } else if (status === 404) {
        errorText = 'Resource not found.';
      } else if (status === 413) {
        errorText = 'Files are too large to regenerate.';
      } else if (status === 429) {
        errorText = 'Too many requests. Please wait a moment.';
      } else if (status >= 500) {
        errorText = 'Server error. Please try again later.';
      } else if (error.response.data?.error) {
        errorText = error.response.data.error;
      } else {
        errorText = `Unexpected error (${status}).`;
      }
    } else if (error.request) {
      errorText = 'No response from server. Check your connection.';
    } else if (error.message && error.message.includes('timeout')) {
      errorText = 'Request timed out. Please try again.';
    } else if (error.message) {
      errorText = `Error: ${error.message}`;
    }

    // Update loading message with error
    dispatch(updateMessage({
      id: loadingMessageId,
      updates: {
        isLoading: false,
        isTyping: false,
        text: errorText
      }
    }));

    clearAIResponding();
    currentLoadingIdRef.current = null;
  }
}, [
  messages, 
  dispatch, 
  currentLoadingIdRef, 
  systemPrompt,
  isProcessingResponseRef,
  startTypingAnimation, 
  temperature, 
  maxTokens,
  conversationId, 
  clearAIResponding, 
  extractAIResponseText,
  scrollToBottom,
  accessToken,
  abortControllerRef,
  userDetails,
]);

  // ===================== ABORT MESSAGE =====================
  const abortMessage = useCallback(() => {
    console.log("🛑 Aborting message");

    // Only abort if there's actually a request in progress
    if (!isProcessingResponseRef.current) {
      console.log("⚠️ No request in progress to abort");
      return;
    }

    if (abortControllerRef.current) {
      console.log("⚠️ Aborting current request");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    cleanupTypingAnimation();

    // Filter out loading and pending messages
    const filteredMessages = messages.filter(
      (msg) =>
        !msg.isLoading &&
        msg.id !== pendingUserMessageRef.current &&
        msg.id !== currentLoadingIdRef.current
    );

    console.log(`🗑️ Removing ${messages.length - filteredMessages.length} messages`);
    dispatch(setMessages(filteredMessages));

    dispatch(setIsAIResponding(false));
    isProcessingResponseRef.current = false;
    currentLoadingIdRef.current = null;
    pendingUserMessageRef.current = null;

    if (sendMessageMutation.isPending) {
      queryClient.cancelQueries({ queryKey: ["sendMessage"] });
      sendMessageMutation.reset();
    }

    dispatch(setIsAborted(true));
    dispatch(setShowAIButtonAction(true));
  }, [
    messages,
    abortControllerRef,
    cleanupTypingAnimation,
    dispatch,
    sendMessageMutation,
    queryClient,
    isProcessingResponseRef,
    currentLoadingIdRef,
    pendingUserMessageRef,
  ]);

  return {
    handleSendMessage,
    startNewConversation,
    loadConversationHistory,
    handleRegenerate,
    abortMessage,
  };
};
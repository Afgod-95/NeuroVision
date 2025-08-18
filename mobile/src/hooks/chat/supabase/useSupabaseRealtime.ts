import { useCallback, useEffect, MutableRefObject, Dispatch, SetStateAction } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import supabase from "@/src/utils/supabase/supabaseClient";
import { SupabaseMessage, Message } from "@/src/utils/interfaces/TypescriptInterfaces";

interface UserDetails {
  id: string;
  [key: string]: any;
}

interface UseSupabaseRealtimeProps {
  conversationId: string;
  userDetails: any;
  loading: boolean;
  realtimeChannelRef: React.RefObject<RealtimeChannel | null>;
  isSubscriptionActiveRef: React.RefObject<boolean>;
  subscribedConversationIdRef: React.RefObject<string | null>;
  subscriptionReadyRef: React.RefObject<boolean>;
  processedMessageIds: React.RefObject<Set<string>>;
  pendingUserMessageRef: React.RefObject<string | null>;
  currentLoadingIdRef: React.RefObject<string | null>;
  abortControllerRef: React.RefObject<AbortController | null>,
  setMessages: Dispatch<SetStateAction<Message[]>>;
  transformSupabaseMessage: (supabaseMessage: SupabaseMessage) => Message;
  startTypingAnimation: (fullText: string, messageId: string) => void;
  clearAIResponding: () => void;
  scrollToBottom: () => void;
  cleanupTypingAnimation: () => void;
}

interface UseSupabaseRealtimeReturn {
  cleanupSubscription: () => void;
}

// Handles all Supabase realtime subscription logic
export const useSupabaseRealtime = ({
  conversationId,
  userDetails,
  loading,
  realtimeChannelRef,
  isSubscriptionActiveRef,
  subscribedConversationIdRef,
  subscriptionReadyRef,
  processedMessageIds,
  pendingUserMessageRef,
  currentLoadingIdRef,
  abortControllerRef,
  setMessages,
  transformSupabaseMessage,
  startTypingAnimation,
  clearAIResponding,
  scrollToBottom,
  cleanupTypingAnimation,
}: UseSupabaseRealtimeProps): UseSupabaseRealtimeReturn => {

  const cleanupSubscription = useCallback(() => {
    if (realtimeChannelRef.current) {
      console.log('Cleaning up existing subscription for conversation:', subscribedConversationIdRef.current);

      try {
        // First unsubscribe the channel
        realtimeChannelRef.current.unsubscribe();
      } catch (error) {
        console.log('Error during channel unsubscribe:', error);
      }

      try {
        // Then remove the channel
        supabase.removeChannel(realtimeChannelRef.current);
      } catch (error) {
        console.log('Error during channel removal:', error);
      }

      realtimeChannelRef.current = null;
    }

    isSubscriptionActiveRef.current = false;
    subscriptionReadyRef.current = false;
    subscribedConversationIdRef.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [
    realtimeChannelRef,
    isSubscriptionActiveRef,
    subscriptionReadyRef,
    subscribedConversationIdRef,
    abortControllerRef
  ]);

  // Improved subscription setup with proper cleanup and conversation switching
  useEffect(() => {
    // Only proceed if we have stable IDs and not loading
    if (!conversationId || !userDetails?.id || loading) {
      console.log('Skipping subscription setup:', {
        conversationId: !!conversationId,
        userId: !!userDetails?.id,
        loading
      });
      return;
    }

    // If we're already subscribed to this conversation, don't resubscribe
    if (isSubscriptionActiveRef.current && subscribedConversationIdRef.current === conversationId) {
      console.log('Already subscribed to conversation:', conversationId);
      return;
    }

    console.log('Setting up realtime subscription for conversation:', conversationId);

    // Clean up existing subscription first
    cleanupSubscription();

    // Clear processed message IDs when switching conversations
    if (subscribedConversationIdRef.current !== conversationId) {
      processedMessageIds.current.clear();
      console.log('Cleared processed message IDs for new conversation');
    }

    // Mark as setting up subscription
    isSubscriptionActiveRef.current = true;
    subscribedConversationIdRef.current = conversationId;
    subscriptionReadyRef.current = false;

    const channel = supabase
      .channel(`messages_${conversationId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('New message received via realtime:', payload.new);

          const newMessage = payload.new as SupabaseMessage;

          // Only process messages for the current conversation
          if (newMessage.conversation_id !== conversationId) {
            console.log('Message for different conversation, ignoring');
            return;
          }

          if (processedMessageIds.current.has(newMessage.id)) {
            console.log('Message already processed, skipping:', newMessage.id);
            return;
          }
          processedMessageIds.current.add(newMessage.id);

          const transformedMessage = transformSupabaseMessage(newMessage);

          setMessages((prev: Message[]) => {
            const exists = prev.some((msg: Message) => msg.id === transformedMessage.id);
            if (exists) {
              console.log('Message already exists in state, skipping:', transformedMessage.id);
              return prev;
            }

            let newMessages = [...prev];

            if (newMessage.sender === 'user' && pendingUserMessageRef.current) {
              console.log('Replacing temp user message:', pendingUserMessageRef.current);
              newMessages = newMessages.filter((msg: Message) => msg.id !== pendingUserMessageRef.current);
              pendingUserMessageRef.current = null;
            }

            if (newMessage.sender === 'assistant') {
              console.log('AI message received, starting typing animation');

              if (currentLoadingIdRef.current) {
                newMessages = newMessages.filter((msg: Message) => msg.id !== currentLoadingIdRef.current);
              } else {
                newMessages = newMessages.filter((msg: Message) => !msg.isLoading);
              }

              // Create message with empty text first, then start typing animation
              const messageWithEmptyText = { ...transformedMessage, text: '', isTyping: true };
              const updatedMessages = [...newMessages, messageWithEmptyText];

              // Start typing animation
              setTimeout(() => {
                startTypingAnimation(transformedMessage.text, transformedMessage.id);
              }, 100);

              clearAIResponding();
              return updatedMessages;
            }

            return [...newMessages, transformedMessage];
          });

          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('Message updated via realtime:', payload.new);

          const updatedMessage = payload.new as SupabaseMessage;

          // Only process messages for the current conversation
          if (updatedMessage.conversation_id !== conversationId) {
            console.log('Update for different conversation, ignoring');
            return;
          }

          const transformedMessage = transformSupabaseMessage(updatedMessage);

          setMessages((prev: Message[]) => {
            let updatedMessages = prev.map((msg: Message) =>
              msg.id === transformedMessage.id ? transformedMessage : msg
            );

            if (updatedMessage.sender === 'assistant') {
              updatedMessages = updatedMessages.filter((msg: Message) => !msg.isLoading);

              // Start typing animation for updated assistant message
              const messageWithEmptyText = updatedMessages.map((msg: Message) =>
                msg.id === transformedMessage.id
                  ? { ...msg, text: '', isTyping: true }
                  : msg
              );

              setTimeout(() => {
                startTypingAnimation(transformedMessage.text, transformedMessage.id);
              }, 100);

              clearAIResponding();
              return messageWithEmptyText;
            }

            return updatedMessages;
          });
        }
      )
      .subscribe((status: string) => {
        console.log(`Subscription status for ${conversationId}:`, status);
        if (status === 'SUBSCRIBED') {
          subscriptionReadyRef.current = true;
          console.log('Realtime subscription ready for conversation:', conversationId);
        } else if (status === 'CLOSED') {
          if (subscribedConversationIdRef.current === conversationId) {
            isSubscriptionActiveRef.current = false;
            subscribedConversationIdRef.current = null;
          }
          console.log('Subscription closed for conversation:', conversationId);
        } else if (status === 'CHANNEL_ERROR') {
          console.log('Channel error for conversation:', conversationId);
          if (subscribedConversationIdRef.current === conversationId) {
            isSubscriptionActiveRef.current = false;
            subscribedConversationIdRef.current = null;
          }
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('Cleaning up realtime subscription via useEffect cleanup');
      cleanupSubscription();
      cleanupTypingAnimation();
    };
  }, [
    conversationId,
    userDetails?.id,
    loading,
    cleanupSubscription,
    transformSupabaseMessage,
    clearAIResponding,
    scrollToBottom,
    startTypingAnimation,
    cleanupTypingAnimation,
    isSubscriptionActiveRef,
    subscribedConversationIdRef,
    processedMessageIds,
    subscriptionReadyRef,
    pendingUserMessageRef,
    currentLoadingIdRef,
    setMessages,
    realtimeChannelRef
  ]);

  return {
    cleanupSubscription,
  };
};
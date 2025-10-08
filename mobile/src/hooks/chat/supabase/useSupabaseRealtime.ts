import { useCallback, useEffect } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import supabase from "@/src/utils/supabase/supabaseClient";
import { SupabaseMessage, Message } from "@/src/utils/interfaces/TypescriptInterfaces";
import { setMessages, addMessage, updateMessage, removeMessage } from "@/src/redux/slices/chatSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";

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
  abortControllerRef: React.RefObject<AbortController | null>;
  transformSupabaseMessage: (supabaseMessage: SupabaseMessage) => Message;
  startTypingAnimation: (fullText: string, messageId: string) => void;
  clearAIResponding: () => void;
  scrollToBottom: () => void;
  cleanupTypingAnimation: () => void;
}

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
  transformSupabaseMessage,
  startTypingAnimation,
  clearAIResponding,
  scrollToBottom,
  cleanupTypingAnimation,
}: UseSupabaseRealtimeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.chat.messages);

  const cleanupSubscription = useCallback(() => {
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.unsubscribe();
        supabase.removeChannel(realtimeChannelRef.current);
      } catch (error) {
        console.error("Error cleaning up subscription:", error);
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
  }, [realtimeChannelRef, isSubscriptionActiveRef, subscriptionReadyRef, subscribedConversationIdRef, abortControllerRef]);

  useEffect(() => {
    if (!conversationId || !userDetails?.id || loading) return;
    if (isSubscriptionActiveRef.current && subscribedConversationIdRef.current === conversationId) return;

    cleanupSubscription();
    processedMessageIds.current.clear();

    isSubscriptionActiveRef.current = true;
    subscribedConversationIdRef.current = conversationId;
    subscriptionReadyRef.current = false;

    const channel = supabase
      .channel(`messages_${conversationId}_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const newMessage = payload.new as SupabaseMessage;
          if (newMessage.conversation_id !== conversationId) return;
          if (processedMessageIds.current.has(newMessage.id)) return;
          
          console.log("📨 Realtime INSERT:", newMessage.sender, newMessage.id);
          processedMessageIds.current.add(newMessage.id);

          const transformedMessage = transformSupabaseMessage(newMessage);

          if (newMessage.sender === "assistant") {
            console.log("🤖 Assistant message received:", newMessage.id);
            
            // Remove loading message if it exists
            if (currentLoadingIdRef.current) {
              console.log("🗑️ Removing loading message:", currentLoadingIdRef.current);
              
              // Remove the old loading message completely
              dispatch(removeMessage(currentLoadingIdRef.current));
              
              // Add the new AI message with typing state
              const messageWithTyping = { 
                ...transformedMessage, 
                text: "", 
                isTyping: true,
                isLoading: false 
              };
              dispatch(addMessage(messageWithTyping));
              
              // Update the ref to point to the new message
              currentLoadingIdRef.current = transformedMessage.id;
              
              // Start typing animation
              setTimeout(() => {
                console.log("🎬 Starting typing animation for:", transformedMessage.id);
                startTypingAnimation(transformedMessage.text, transformedMessage.id);
              }, 100);
            } else {
              // No loading message, add new message with typing
              const messageWithTyping = { ...transformedMessage, text: "", isTyping: true };
              dispatch(addMessage(messageWithTyping));
              
              setTimeout(() => {
                startTypingAnimation(transformedMessage.text, transformedMessage.id);
              }, 100);
            }
          }

          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const updatedMessage = payload.new as SupabaseMessage;
          if (updatedMessage.conversation_id !== conversationId) return;

          console.log("🔄 Realtime UPDATE:", updatedMessage.sender, updatedMessage.id);
          const transformedMessage = transformSupabaseMessage(updatedMessage);

          if (updatedMessage.sender === "assistant") {
            // Update message and start typing animation
            dispatch(updateMessage({
              id: transformedMessage.id,
              updates: {
                text: "",
                isTyping: true,
                isLoading: false
              }
            }));
            
            setTimeout(() => {
              startTypingAnimation(transformedMessage.text, transformedMessage.id);
            }, 100);
          } else {
            // Just update the message
            dispatch(updateMessage({
              id: transformedMessage.id,
              updates: transformedMessage
            }));
          }
        }
      )
      .subscribe((status: string) => {
        console.log("🔌 Subscription status:", status);
        if (status === "SUBSCRIBED") {
          subscriptionReadyRef.current = true;
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          if (subscribedConversationIdRef.current === conversationId) {
            isSubscriptionActiveRef.current = false;
            subscribedConversationIdRef.current = null;
          }
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
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
    messages,
    dispatch,
    currentLoadingIdRef,
    isSubscriptionActiveRef,
    realtimeChannelRef,
    pendingUserMessageRef,
    subscribedConversationIdRef,
    subscriptionReadyRef,
    processedMessageIds
  ]);

  return { cleanupSubscription };
};
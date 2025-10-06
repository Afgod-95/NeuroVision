import { useCallback, useEffect } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import supabase from "@/src/utils/supabase/supabaseClient";
import { SupabaseMessage, Message } from "@/src/utils/interfaces/TypescriptInterfaces";
import { setMessages, addMessage, updateMessage } from "@/src/redux/slices/chatSlice";
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
          processedMessageIds.current.add(newMessage.id);

          const transformedMessage = transformSupabaseMessage(newMessage);

          // Handle temp replacement for pending user message
          let updatedMessages = messages;
          if (newMessage.sender === "user" && pendingUserMessageRef.current) {
            updatedMessages = messages.filter(msg => msg.id !== pendingUserMessageRef.current);
            pendingUserMessageRef.current = null;
          }

          if (newMessage.sender === "assistant") {
            updatedMessages = updatedMessages.filter(
              msg => msg.id !== currentLoadingIdRef.current && !msg.isLoading
            );
            const messageWithEmptyText = { ...transformedMessage, text: "", isTyping: true };
            dispatch(setMessages([...updatedMessages, messageWithEmptyText]));
            setTimeout(() => startTypingAnimation(transformedMessage.text, transformedMessage.id), 100);
            clearAIResponding();
          } else {
            dispatch(setMessages([...updatedMessages, transformedMessage]));
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

          const transformedMessage = transformSupabaseMessage(updatedMessage);

          if (updatedMessage.sender === "assistant") {
            // Replace with typing animation
            const cleanedMessages = messages.filter(msg => !msg.isLoading);
            const withTyping = cleanedMessages.map(msg =>
              msg.id === transformedMessage.id ? { ...transformedMessage, text: "", isTyping: true } : msg
            );
            dispatch(setMessages(withTyping));
            setTimeout(() => startTypingAnimation(transformedMessage.text, transformedMessage.id), 100);
            clearAIResponding();
          } else {
            dispatch(
              setMessages(
                messages.map(msg =>
                  msg.id === transformedMessage.id ? { ...transformedMessage, isTyping: false } : msg
                )
              )
            );
          }
        }
      )
      .subscribe((status: string) => {
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

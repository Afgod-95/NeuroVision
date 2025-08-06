import { useEffect, useCallback } from "react";
import { RealtimeChatProps } from "@/src/utils/interfaces/TypescriptInterfaces";
import { useRealtimeChatState } from "./states/useRealtimeChatStates";
import { useMessageUtils } from "./utils/useMessageUtils";
import { useTypingAnimation } from "./animations/useTypingAnimation";
import { useAIResponseManager } from "./ai/useAIResponseManager";
import { useMessageMutation } from "./mutations/useMessageMutation";
import { useSupabaseRealtime } from "./realtime/useSupabaseRealtime";
import { useConversationActions } from "./actions/useConversationActions";
import supabase from "@/src/utils/supabase/supabaseClient";
import { useMessageOptions } from "@/src/hooks/userMessagePreview/useMessageOptions";

// Main hook that orchestrates all the smaller hooks
export const useRealtimeChat = ({
    uniqueConvId,
    systemPrompt = "You are a helpful AI Assistant",
    temperature = 0.7,
    maxTokens = 1048576,
    onMessagesChange,
    onLoadingChange,
}: RealtimeChatProps) => {

    const state = useRealtimeChatState();

    // Helpers
    const messageUtils = useMessageUtils(state.flatListRef);
    const typingAnimation = useTypingAnimation({ ...state, ...messageUtils });
    const aiResponseManager = useAIResponseManager({ ...state, ...typingAnimation });

    // supabase real time subscription
    const supabaseRealtimeSubscription = useSupabaseRealtime({ ...state, ...typingAnimation, ...aiResponseManager, ...messageUtils })

    //send message mutation
    const sendMessageMutation = useMessageMutation({
        systemPrompt,
        temperature,
        maxTokens,
        ...state,
        ...typingAnimation,
        ...aiResponseManager,
        ...messageUtils
    })

    //actions 
    const conversationActions = useConversationActions({
        systemPrompt,
        temperature,
        maxTokens,
        ...state,
        scrollToBottom: messageUtils.scrollToBottom,
        cleanupSubscription: supabaseRealtimeSubscription.cleanupSubscription,
        clearAIResponding: aiResponseManager.clearAIResponding,
        sendMessageMutation: sendMessageMutation.sendMessageMutation,
        cleanupTypingAnimation: typingAnimation.cleanupTypingAnimation,
        startTypingAnimation: typingAnimation.startTypingAnimation,
        extractAIResponseText: messageUtils.extractAIResponseText,
        queryClient: state.queryClient,
    })


    //Initialize conversationId once
    useEffect(() => {
        if (state.userDetails?.id && uniqueConvId && !state.conversationId) {
            console.log('Setting initial conversation ID:', uniqueConvId);
            state.setConversationId(uniqueConvId);
        }
    }, [state, uniqueConvId]);

    useEffect(() => {
        if (state.isEdited && state.messageId) {
            state.setMessage(state.messageId);
        }
    }, [state.isEdited, state.messageId]);

    const { handleEditMessage } = useMessageOptions();
    const handleEditMessageCallback = useCallback(() => {
        handleEditMessage(state.message);
    }, [handleEditMessage, state.message]);

    useEffect(() => {
        if (onLoadingChange) {
            onLoadingChange(state.isAIResponding);
        }
    }, [state.isAIResponding, onLoadingChange]);

    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(state.messages);
        }
    }, [state.messages, onMessagesChange]);



    return {
        // State
        messages: state.messages,
        loading: state.loading,
        isAIResponding: state.isAIResponding,
        isRecording: state.isRecording,
        message: state.message,
        isTyping: state.isTyping,
        isSidebarVisible: state.isSidebarVisible,
        conversationId: state.conversationId,
        username: state.username,

        userCredentials: state.userDetails,

        // Actions
        handleSendMessage: conversationActions.handleSendMessage,
        abortMessage: conversationActions.abortMessage,
        handleRegenerate: conversationActions.handleRegenerate,
        handleEditMessageCallback: handleEditMessageCallback,
        startNewConversation: conversationActions.startNewConversation,
        loadConversationHistory: conversationActions.loadConversationHistory,
        setMessage: state.setMessage,
        setMessages: state.setMessages,
        setIsRecording: state.setIsRecording,
        setIsSidebarVisible: state.setIsSidebarVisible,
        scrollToBottom: messageUtils.scrollToBottom,

        // Refs for external access
        flatListRef: state.flatListRef,
        // Mutation object
        sendMessageMutation: sendMessageMutation.sendMessageMutation,
    };
};


import { useCallback } from "react";
import { Message } from "@/src/utils/interfaces/TypescriptInterfaces";
import { useConversationMutation } from "../mutations/useConversationMutation";
import { uniqueConvId as startNewConversationId } from "@/src/constants/generateConversationId";
import api from "@/src/services/axiosClient";
import { QueryClient, UseMutationResult } from "@tanstack/react-query";
import { UploadedAudioFile } from "@/src/utils/interfaces/TypescriptInterfaces";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";

type useConversationActionsType = {
    userDetails: any,
    conversationId: string,
    systemPrompt: string,

    temperature: number,
    maxTokens: number,

    //states and refs
    isAIResponding: boolean,
    abortControllerRef: React.RefObject<AbortController | null>,
    queryClient: QueryClient,
    messages: Message[],
    setMessage: (message: string) => void,
    setAttachment: (attachment: any[]) => void,
    setIsAborted: (isAborted: boolean) => void,
    setShowAIButtonAction: (showAIButtonAction: boolean) => void,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setConversationId: (conversationId: string) => void,
    isProcessingResponseRef: React.RefObject<boolean>,
    setLoading: (loading: boolean) => void,
    pendingUserMessageRef: React.RefObject<string | null>,
    currentLoadingIdRef: React.RefObject<string | null>,
    processedMessageIds: React.RefObject<Set<string>>,

    setIsAIResponding: (responding: boolean) => void,
    scrollToBottom: () => void,
    setNewChat: (newChat: boolean) => void,

    clearAIResponding: () => void,
    sendMessageMutation: UseMutationResult<any, unknown, any, unknown>,
    cleanupSubscription: () => void,
    cleanupTypingAnimation: () => void,
    extractAIResponseText: (data: any) => any,
    startTypingAnimation: ((aiResponseText: string, fallbackMessage: any) => void),
}


// Handles conversation-level actions
export const useConversationActions = ({
    //user

    //prompts 
    systemPrompt,
    temperature,
    maxTokens,


    userDetails,
    conversationId,

    //states and refs
    messages,
    isAIResponding,
    abortControllerRef,
    queryClient,
    setMessage,
    setMessages,
    setAttachment,
    setIsAborted,
    setShowAIButtonAction,
    setNewChat,
    setConversationId,
    isProcessingResponseRef,
    setLoading,
    pendingUserMessageRef,
    currentLoadingIdRef,
    processedMessageIds,

    setIsAIResponding,
    scrollToBottom,

    clearAIResponding,
    sendMessageMutation,
    startTypingAnimation,
    cleanupSubscription,
    cleanupTypingAnimation,

    extractAIResponseText,

}: useConversationActionsType) => {

    const { accessToken } = useSelector((state: RootState) => state.auth);


    const handleSendMessage = useCallback(async (messageText: string, audioFile?: UploadedAudioFile) => {
       
        if (!messageText.trim() && !audioFile) {
            return;
        }

        if (isProcessingResponseRef.current) {
            console.log('Already processing a response, ignoring request');
            return;
        }
        setMessage('');
        setAttachment([]);
        setIsAborted(false);
        sendMessageMutation.mutate({ messageText, audioFile });

    }, [sendMessageMutation, isProcessingResponseRef, 
        setAttachment, setMessage, 
        setIsAborted
    ]);

    //start new conversation
    const startNewConversation = useCallback(() => {
        const newConvId = startNewConversationId;
        // Clean up current subscription and typing animation
        cleanupSubscription();
        cleanupTypingAnimation();

        // Reset all state
        setConversationId(newConvId);
        setMessages([]);
        setNewChat(true);
        pendingUserMessageRef.current = null;
        currentLoadingIdRef.current = null;
        processedMessageIds.current.clear();
        clearAIResponding();
        setIsAborted(false);
        setLoading(false);
    }, [clearAIResponding, currentLoadingIdRef, pendingUserMessageRef,processedMessageIds,setConversationId,setIsAborted, setMessages, setLoading,setNewChat, cleanupSubscription, cleanupTypingAnimation]);

    const { useFetchMessagesMutation } = useConversationMutation(accessToken as string)

    const loadConversationHistoryMutation = useFetchMessagesMutation();

    const loadConversationHistory = useCallback(async () => {
        try {
            setLoading(true);
            setIsAborted(false);

            const response = await loadConversationHistoryMutation.mutateAsync(userDetails?.id);

            const extractedMessages = response.history?.map((item: { content: string; role: string }) => ({
                content: item.content,
                role: item.role,
            })) ?? [];

            console.log(`Extract: ${JSON.stringify(extractedMessages)}`);
            console.log(`Messages updated: ${extractedMessages.length}`);
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        } finally {
            setLoading(false);
        }
    }, [userDetails?.id, setIsAborted, setLoading, loadConversationHistoryMutation]);

    //handle regenerate function
    const handleRegenerate = useCallback(async (messageId: string) => {
        if (isProcessingResponseRef.current) {
            console.log('Already processing a response, ignoring regenerate request');
            return;
        }
        setIsAborted(false);

        const currentIndex = messages.findIndex(msg => msg.id === messageId);
        const previousUserMessage = messages.slice(0, currentIndex).reverse().find(msg => msg.user);

        if (previousUserMessage) {
            isProcessingResponseRef.current = true;

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

            setMessages(prev => {
                // Remove the message being regenerated AND the most recent message
                const filtered = prev.filter((msg, index) => {
                    // Remove the specific message being regenerated
                    if (msg.id === messageId) return false;

                    // Remove the most recent message (last message in the array)
                    if (index === prev.length - 1) return false;

                    return true;
                });

                return [...filtered, loadingMessage];
            });

            setIsAIResponding(true);
            scrollToBottom();

            try {
                const payload = {
                    message: previousUserMessage.text,
                    systemPrompt: systemPrompt,
                    temperature: temperature,
                    maxTokens: maxTokens,
                    conversationId: conversationId,
                    useDatabase: true,
                }
                const response = await api.post('/api/conversations/send-message', payload, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                const aiResponseText = extractAIResponseText(response.data);

                if (!aiResponseText || aiResponseText.trim() === '') {
                    throw new Error('AI response is empty or invalid');
                }


                if (isProcessingResponseRef.current && currentLoadingIdRef.current === loadingMessageId) {
                    console.log('Regeneration fallback: manually clearing loading state');
                    clearAIResponding();

                    setMessages((prev) => {
                        const withoutLoading = prev.filter(msg => msg.id !== loadingMessageId);

                        const fallbackMessage: Message = {
                            id: `regen-fallback-${Date.now()}`,
                            text: '',
                            user: false,
                            created_at: new Date().toISOString(),
                            timestamp: new Date().toISOString(),
                            sender: 'assistant',
                            isTyping: true
                        };

                        // Start typing animation for regenerated message
                        setTimeout(() => {
                            startTypingAnimation(aiResponseText, fallbackMessage.id);
                        }, 100);

                        return [...withoutLoading, fallbackMessage];
                    });
                }


            } catch (error: any) {
                console.error('Failed to regenerate message:', error);

                let errorText = 'Failed to regenerate response. Please try again.';

                if (error.response) {
                    const status = error.response.status;
                    if (status === 401) {
                        errorText = 'You are not authorized to regenerate this response. Please log in again.';
                    } else if (status === 403) {
                        errorText = 'Access denied. You do not have permission to regenerate this response.';
                    } else if (status === 404) {
                        errorText = 'Resource not found. This conversation or message may have been deleted.';
                    } else if (status === 429) {
                        errorText = 'Too many requests. Please wait a moment and try again.';
                    } else if (status >= 500) {
                        errorText = 'Server error occurred. Please try again later.';
                    } else {
                        errorText = `Unexpected error (${status}). Please try again.`;
                    }
                } else if (error.request) {
                    errorText = 'No response from server. Please check your internet connection.';
                } else if (error.message && error.message.includes('timeout')) {
                    errorText = 'The request timed out. Please try again in a few moments.';
                } else if (error.message) {
                    errorText = `Error: ${error.message}`;
                }

                setMessages(prev => {
                    const withoutLoading = prev.filter(msg => msg.id !== currentLoadingIdRef.current);
                    const errorMessage: Message = {
                        id: `error-${Date.now()}`,
                        text: errorText,
                        user: false,
                        created_at: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        sender: 'assistant'
                    };
                    return [...withoutLoading, errorMessage];
                });

                clearAIResponding();
            }
        }
    }, [messages, currentLoadingIdRef, systemPrompt,isProcessingResponseRef, 
        startTypingAnimation, setIsAIResponding, setIsAborted, setMessages, 
        temperature, maxTokens, 
        conversationId, clearAIResponding, extractAIResponseText, scrollToBottom, 
        accessToken
    ]);

    //abort message 
    const abortMessage = useCallback(() => {
        console.log('Aborting message - Current state:', {
            isAIResponding,
            isProcessingResponse: isProcessingResponseRef.current,
            currentLoadingId: currentLoadingIdRef.current,
            hasAbortController: !!abortControllerRef.current
        });

        // Abort the API call if it exists
        if (abortControllerRef.current) {
            console.log('Aborting ongoing message API call');
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Clean up typing animation
        cleanupTypingAnimation();

        // Remove loading messages from the UI
        setMessages(prev => {
            const filteredMessages = prev.filter(msg => {
                // Remove loading messages
                if (msg.isLoading) return false;
                // Remove temporary user messages that haven't been saved yet
                if (pendingUserMessageRef.current && msg.id === pendingUserMessageRef.current) return false;
                // Remove the current loading message if it exists
                if (currentLoadingIdRef.current && msg.id === currentLoadingIdRef.current) return false;
                return true;
            });

            console.log('Messages after abort cleanup:', {
                before: prev.length,
                after: filteredMessages.length,
                removed: prev.length - filteredMessages.length
            });

            return filteredMessages;
        });

        // Reset all processing states
        setIsAIResponding(false);
        isProcessingResponseRef.current = false;
        currentLoadingIdRef.current = null;
        pendingUserMessageRef.current = null;

        // Cancel the mutation if it's still pending
        if (sendMessageMutation.isPending) {
            console.log('Resetting pending mutation');
            queryClient.cancelQueries({ queryKey: ['sendMessage'] });
            sendMessageMutation.reset();
        }

        setIsAborted(true);
        setShowAIButtonAction(true);

        console.log('Message abort completed');
    }, [cleanupTypingAnimation, abortControllerRef, currentLoadingIdRef, isAIResponding,
        sendMessageMutation, queryClient, isProcessingResponseRef, setIsAIResponding, 
        pendingUserMessageRef, setIsAborted, setMessages, setShowAIButtonAction
    ]);


    return {
        handleSendMessage,
        handleRegenerate,
        startNewConversation,
        loadConversationHistory,
        abortMessage
    };
};
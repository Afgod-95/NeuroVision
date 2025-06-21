import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import supabase from '@/src/supabase/supabaseClient';
import {
    RootState,
    MessageContent,
    SupabaseMessage,
    UploadedAudioFile,
    RealtimeChatProps,
    Message,
} from '@/src/utils/interfaces/TypescriptInterfaces';
import axios from 'axios';
import { useMessageOptions } from '../UserMessageOptions';
import { useFetchMessagesMutation } from '../conversations/ConversationsMutation';

const useRealtimeChat = ({
    uniqueConvId,
    systemPrompt = "You are a helpful AI Assistant",
    temperature = 0.7,
    maxTokens = 4096,
    onMessagesChange,
    onLoadingChange,
    initialMessages = [],
    enableSampleMessages = false,
}: RealtimeChatProps) => {
    const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAIResponding, setIsAIResponding] = useState<boolean>(false);
    const [conversationId, setConversationId] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const realtimeChannelRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const pendingUserMessageRef = useRef<string | null>(null);
    const isProcessingResponseRef = useRef<boolean>(false);
    const processedMessageIds = useRef<Set<string>>(new Set());
    const currentLoadingIdRef = useRef<string | null>(null);
    const subscriptionReadyRef = useRef<boolean>(false); // NEW: Track subscription status

    const { user: userDetails } = useSelector((state: RootState) => state.user);
    const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);
    const queryClient = useQueryClient();

    const username = useMemo(() => userDetails?.username?.split(" ")[0], [userDetails?.username]);

    // FIXED: More robust clearing function with timeout fallback
    const clearAIResponding = useCallback(() => {
        console.log('Clearing AI responding state');
        
        setIsAIResponding(prevState => {
            if (prevState) {
                console.log('AI responding state cleared');
            }
            return false;
        });

        isProcessingResponseRef.current = false;
        currentLoadingIdRef.current = null;
        
        // ADDED: Fallback timeout to ensure state is cleared
        setTimeout(() => {
            setIsAIResponding(false);
            isProcessingResponseRef.current = false;
            currentLoadingIdRef.current = null;
        }, 100);
    }, []);

    // Generate or get conversation ID
    useEffect(() => {
        if (userDetails?.id) {
            const convId = uniqueConvId;
            setConversationId(convId);
        }
    }, [userDetails?.id, uniqueConvId]);

    // Initialize with sample messages for demonstration
    useEffect(() => {
        if (conversationId && userDetails?.id) {
            const sampleMessages: Message[] = [];
            setMessages(sampleMessages);
            setLoading(false);
        }
    }, [conversationId, userDetails?.id]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, []);

    const transformSupabaseMessage = useCallback((supabaseMessage: SupabaseMessage): Message => {
        let content: MessageContent;
        let text: string;

        try {
            const parsed = JSON.parse(supabaseMessage.content);
            content = parsed;
            text = parsed.text || supabaseMessage.content;
        } catch {
            content = { type: 'text', text: supabaseMessage.content };
            text = supabaseMessage.content;
        }

        return {
            id: supabaseMessage.id,
            conversation_id: supabaseMessage.conversation_id,
            user_id: supabaseMessage.user_id,
            sender: supabaseMessage.sender,
            text: text,
            created_at: supabaseMessage.created_at,
            timestamp: supabaseMessage.created_at,
            user: supabaseMessage.sender === 'user',
            content: content,
        };
    }, []);

    // FIXED: Enhanced realtime subscription with better state management
    useEffect(() => {
        if (!conversationId || !userDetails?.id) return;

        // Clean up existing channel
        if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
        }

        subscriptionReadyRef.current = false; // Reset subscription status

        const channel = supabase
            .channel(`messages_${conversationId}`)
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

                    // Prevent duplicate processing
                    if (processedMessageIds.current.has(newMessage.id)) {
                        console.log('Message already processed, skipping:', newMessage.id);
                        return;
                    }
                    processedMessageIds.current.add(newMessage.id);

                    const transformedMessage = transformSupabaseMessage(newMessage);

                    setMessages(prev => {
                        const exists = prev.some(msg => msg.id === transformedMessage.id);
                        if (exists) {
                            console.log('Message already exists in state, skipping:', transformedMessage.id);
                            return prev;
                        }

                        let newMessages = [...prev];

                        // For user messages, replace the temporary one
                        if (newMessage.sender === 'user' && pendingUserMessageRef.current) {
                            console.log('Replacing temp user message:', pendingUserMessageRef.current);
                            newMessages = newMessages.filter(msg => msg.id !== pendingUserMessageRef.current);
                            pendingUserMessageRef.current = null;
                        }

                        // FIXED: Better handling of AI messages and loading state
                        if (newMessage.sender === 'assistant') {
                            console.log('AI message received, clearing loading state');
                            
                            // Remove loading messages
                            if (currentLoadingIdRef.current) {
                                newMessages = newMessages.filter(msg => msg.id !== currentLoadingIdRef.current);
                            } else {
                                newMessages = newMessages.filter(msg => !msg.isLoading);
                            }

                            // FIXED: Immediate state clearing
                            clearAIResponding();
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
                    const transformedMessage = transformSupabaseMessage(updatedMessage);

                    setMessages(prev => {
                        let updatedMessages = prev.map(msg =>
                            msg.id === transformedMessage.id ? transformedMessage : msg
                        );

                        // Remove loading messages if this is an assistant update
                        if (updatedMessage.sender === 'assistant') {
                            updatedMessages = updatedMessages.filter(msg => !msg.isLoading);
                            clearAIResponding(); // Clear loading state
                        }

                        return updatedMessages;
                    });
                }
            )
            .subscribe((status) => {
                console.log('Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    subscriptionReadyRef.current = true;
                    console.log('Realtime subscription ready');
                }
            });

        realtimeChannelRef.current = channel;

        return () => {
            if (realtimeChannelRef.current) {
                supabase.removeChannel(realtimeChannelRef.current);
                realtimeChannelRef.current = null;
            }
            subscriptionReadyRef.current = false;
        };
    }, [conversationId, userDetails?.id, scrollToBottom, clearAIResponding, transformSupabaseMessage]);

    const saveMessageToSupabase = useCallback(async (
        messageText: string,
        sender: 'user' | 'assistant' | 'system',
        messageContent?: MessageContent
    ) => {
        if (!conversationId || !userDetails?.id) {
            throw new Error('Missing conversation ID or user ID');
        }

        const contentToSave = messageContent ? JSON.stringify(messageContent) : messageText;

        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                user_id: userDetails.id,
                sender,
                content: contentToSave,
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving message to Supabase:', error);
            throw error;
        }

        return data;
    }, [conversationId, userDetails?.id]);

    const extractAIResponseText = useCallback((aiResponse: any): string => {
        const possibleFields = [
            'response',
            'message',
            'content',
            'text',
            'answer',
            'reply'
        ];

        for (const field of possibleFields) {
            if (aiResponse[field] && typeof aiResponse[field] === 'string' && aiResponse[field].trim()) {
                return aiResponse[field].trim();
            }
        }

        if (typeof aiResponse === 'string' && aiResponse.trim()) {
            return aiResponse.trim();
        }

        console.log('AI Response structure:', JSON.stringify(aiResponse, null, 2));
        return 'I apologize, but I was unable to generate a proper response. Please try again.';
    }, []);

    // FIXED: Enhanced mutation with better timeout handling
    const sendMessageMutation = useMutation({
        mutationFn: async ({ messageText, audioFile }: { messageText: string, audioFile?: UploadedAudioFile }) => {
            let finalMessage = messageText;
            let messageContent: MessageContent | undefined;

            if (audioFile) {
                messageContent = {
                    type: messageText.trim() ? 'mixed' : 'audio',
                    text: messageText.trim() || undefined,
                    audioUrl: audioFile.uploadResult?.signedUrl,
                    audioName: audioFile?.name || 'Voice message',
                    audioDuration: audioFile.duration ? audioFile.duration * 1000 : undefined,
                };
                finalMessage = messageText.trim() || 'Voice message';
            } else if (messageText.trim()) {
                messageContent = {
                    type: 'text',
                    text: messageText,
                };
            }

            if (audioFile && userDetails?.id) {
                try {
                    console.log('Starting audio transcription...');

                    if (!audioFile.uploadResult?.signedUrl) {
                        throw new Error('No audio URL available for transcription');
                    }

                    const transcriptionResult = await axios.post('/api/chats/transcribe-audio', {
                        userId: userDetails.id,
                        audioUrl: audioFile.uploadResult.signedUrl
                    });

                    const { transcriptionResult: transcription } = transcriptionResult.data;

                    if (transcription && transcription.status === 'complete' && transcription.text) {
                        finalMessage = transcription.text;
                        console.log('Transcription successful:', finalMessage);
                    } else if (transcription && transcription.status === 'failed') {
                        throw new Error(`Transcription failed: ${transcription.error || 'Unknown error'}`);
                    }
                } catch (error: any) {
                    console.error('Transcription error:', error);
                    throw new Error(`Transcription failed: ${error.message}`);
                }
            }

            const response = await axios.post('/api/conversations/send-message', {
                message: finalMessage,
                systemPrompt: systemPrompt,
                temperature: temperature,
                maxTokens: maxTokens,
                conversationId: conversationId,
                userId: userDetails?.id,
                useDatabase: true,
            });

            if (!response.data) {
                throw new Error('No response data received from AI service');
            }

            return {
                userMessage: finalMessage,
                aiResponse: response.data,
                originalAudioFile: audioFile,
                conversationId: response.data.conversationId,
            };
        },
        onMutate: ({ messageText, audioFile }) => {
            console.log('Mutation started, setting AI responding to true');

            if (isProcessingResponseRef.current) {
                console.log('Already processing, cancelling new request');
                throw new Error('Already processing a request');
            }

            isProcessingResponseRef.current = true;

            const tempUserMessageId = `temp-user-${Date.now()}`;
            let messageContent: MessageContent | undefined;
            let finalMessage = messageText;

            if (audioFile) {
                messageContent = {
                    type: messageText.trim() ? 'mixed' : 'audio',
                    text: messageText.trim() || undefined,
                    audioUrl: audioFile.uploadResult?.signedUrl,
                    audioName: audioFile?.name || 'Voice message',
                    audioDuration: audioFile.duration ? audioFile.duration * 1000 : undefined,
                };
                finalMessage = messageText.trim() || 'Voice message';
            } else if (messageText.trim()) {
                messageContent = {
                    type: 'text',
                    text: messageText,
                };
            }

            const tempUserMessage: Message = {
                id: tempUserMessageId,
                text: finalMessage,
                user: true,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                sender: 'user',
                content: messageContent,
            };

            const loadingMessageId = `loading-${Date.now()}`;
            const loadingMessage: Message = {
                id: loadingMessageId,
                text: '',
                user: false,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                sender: 'assistant',
                isLoading: true
            };

            pendingUserMessageRef.current = tempUserMessageId;
            currentLoadingIdRef.current = loadingMessageId;

            setMessages(prev => [...prev, tempUserMessage, loadingMessage]);
            setIsAIResponding(true);

            scrollToBottom();

            // ADDED: Timeout fallback to clear loading state
            setTimeout(() => {
                if (isProcessingResponseRef.current && currentLoadingIdRef.current === loadingMessageId) {
                    console.log('Timeout fallback: clearing loading state');
                    clearAIResponding();
                    
                    setMessages(prev => {
                        const withoutLoading = prev.filter(msg => msg.id !== loadingMessageId);
                        const timeoutMessage: Message = {
                            id: `timeout-${Date.now()}`,
                            text: 'Request timed out. Please try again.',
                            user: false,
                            created_at: new Date().toISOString(),
                            timestamp: new Date().toISOString(),
                            sender: 'assistant'
                        };
                        return [...withoutLoading, timeoutMessage];
                    });
                }
            }, 30000); // 30 second timeout
        },
        onSuccess: async (data) => {
            console.log('Message sent successfully:', data);

            if (data.conversationId && data.conversationId !== conversationId) {
                setConversationId(data.conversationId);
            }

            try {
                const aiResponseText = extractAIResponseText(data.aiResponse);

                if (!aiResponseText || aiResponseText.trim() === '') {
                    throw new Error('AI response is empty or invalid');
                }

                console.log('AI response received, waiting for realtime update...');

                // ADDED: Fallback timeout in case realtime doesn't work
                setTimeout(() => {
                    if (isProcessingResponseRef.current) {
                        console.log('Realtime fallback: manually clearing loading state');
                        clearAIResponding();
                        
                        setMessages(prev => {
                            const withoutLoading = prev.filter(msg => !msg.isLoading);
                            
                            // Check if the response already exists
                            const responseExists = prev.some(msg => 
                                msg.sender === 'assistant' && 
                                msg.text === aiResponseText && 
                                !msg.isLoading
                            );
                            
                            if (!responseExists) {
                                const fallbackMessage: Message = {
                                    id: `fallback-${Date.now()}`,
                                    text: aiResponseText,
                                    user: false,
                                    created_at: new Date().toISOString(),
                                    timestamp: new Date().toISOString(),
                                    sender: 'assistant'
                                };
                                return [...withoutLoading, fallbackMessage];
                            }
                            
                            return withoutLoading;
                        });
                    }
                }, 5000); // 5 second fallback

            } catch (error) {
                console.error('Failed to process AI response:', error);

                setMessages(prev => {
                    const withoutLoading = prev.filter(msg => msg.id !== currentLoadingIdRef.current);
                    
                    const errorMessage: Message = {
                        id: `error-${Date.now()}`,
                        text: 'Failed to get a valid response from AI. Please try again.',
                        user: false,
                        created_at: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        sender: 'assistant'
                    };

                    return [...withoutLoading, errorMessage];
                });
                
                clearAIResponding();
            }
        },
        onError: (error: any) => {
            console.error('Failed to send message:', error);

            setMessages(prev => {
                const withoutLoading = prev.filter(msg => msg.id !== currentLoadingIdRef.current);

                let errorText = 'Sorry, I encountered an error processing your message.';

                if (error.message === 'Already processing a request') {
                    return prev;
                }

                if (error.response?.data?.error) {
                    const backendError = error.response.data.error;

                    if (backendError.includes('Message is required')) {
                        errorText = 'Please provide a message to send.';
                    } else if (backendError.includes('Message is too long')) {
                        errorText = 'Your message is too long. Please shorten it and try again.';
                    } else if (backendError.includes('userId is required')) {
                        errorText = 'Authentication error. Please log in again.';
                    } else if (backendError.includes('Invalid conversation ID')) {
                        errorText = 'Conversation error. Starting a new conversation.';
                        setConversationId('');
                    } else if (backendError.includes('Invalid user ID')) {
                        errorText = 'User authentication error. Please log in again.';
                    } else if (backendError.includes('API quota exceeded')) {
                        errorText = 'Service temporarily unavailable. Please try again later.';
                    } else if (backendError.includes('Database error')) {
                        errorText = 'Database connection error. Please try again.';
                    } else if (backendError.includes('Failed to get response from Gemini')) {
                        errorText = 'AI service temporarily unavailable. Please try again.';
                    } else {
                        errorText = backendError;
                    }
                } else if (error.message.includes('Transcription')) {
                    errorText = `Audio transcription error: ${error.message}`;
                } else if (error.response?.status === 400) {
                    errorText = 'Invalid request. Please check your input and try again.';
                } else if (error.response?.status === 404) {
                    errorText = 'Service not found. Please check your API configuration.';
                } else if (error.response?.status === 429) {
                    errorText = 'Too many requests. Please wait a moment and try again.';
                } else if (error.response?.status === 500) {
                    errorText = 'Server error. Please try again in a moment.';
                } else if (error.message) {
                    errorText = `Error: ${error.message}`;
                }

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
            pendingUserMessageRef.current = null;
        }
    });

    const handleSendMessage = useCallback(async (messageText: string, audioFile?: UploadedAudioFile) => {
        console.log('handleSendMessage called with:', { messageText, audioFile });

        if (!messageText.trim() && !audioFile) {
            return;
        }

        if (isProcessingResponseRef.current) {
            console.log('Already processing a response, ignoring request');
            return;
        }

        setMessage('');
        sendMessageMutation.mutate({ messageText, audioFile });
    }, [sendMessageMutation]);

    const startNewConversation = useCallback(() => {
        const newConvId = uniqueConvId;
        setConversationId(newConvId);
        setMessages([]);
        pendingUserMessageRef.current = null;
        currentLoadingIdRef.current = null;
        processedMessageIds.current.clear();
        clearAIResponding();
    }, [uniqueConvId, clearAIResponding]);

    const loadConversationHistoryMutation = useFetchMessagesMutation();

    const loadConversationHistory = useCallback(async () => {
        try {
            setLoading(true);

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
    }, [userDetails?.id]);

    const handleRegenerate = useCallback(async (messageId: string) => {
        if (isProcessingResponseRef.current) {
            console.log('Already processing a response, ignoring regenerate request');
            return;
        }

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
                const filtered = prev.filter(msg => msg.id !== messageId);
                return [...filtered, loadingMessage];
            });
            
            setIsAIResponding(true);
            scrollToBottom();

            try {
                const response = await axios.post('/api/conversations/send-message', {
                    message: previousUserMessage.text,
                    systemPrompt: systemPrompt,
                    temperature: temperature,
                    maxTokens: maxTokens,
                    conversationId: conversationId,
                    userId: userDetails?.id,
                    useDatabase: true,
                });

                const aiResponseText = extractAIResponseText(response.data);

                if (!aiResponseText || aiResponseText.trim() === '') {
                    throw new Error('AI response is empty or invalid');
                }

                // ADDED: Same fallback timeout for regeneration
                setTimeout(() => {
                    if (isProcessingResponseRef.current && currentLoadingIdRef.current === loadingMessageId) {
                        console.log('Regeneration fallback: manually clearing loading state');
                        clearAIResponding();
                        
                        setMessages(prev => {
                            const withoutLoading = prev.filter(msg => msg.id !== loadingMessageId);
                            
                            const fallbackMessage: Message = {
                                id: `regen-fallback-${Date.now()}`,
                                text: aiResponseText,
                                user: false,
                                created_at: new Date().toISOString(),
                                timestamp: new Date().toISOString(),
                                sender: 'assistant'
                            };
                            return [...withoutLoading, fallbackMessage];
                        });
                    }
                }, 5000);

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
    }, [messages, systemPrompt, temperature, maxTokens, conversationId, userDetails?.id, clearAIResponding, extractAIResponseText, scrollToBottom]);

    useEffect(() => {
        if (isEdited && messageId) {
            setMessage(messageId);
        }
    }, [isEdited, messageId]);

    const { handleEditMessage } = useMessageOptions();
    const handleEditMessageCallback = useCallback(() => {
        handleEditMessage(message);
    }, [handleEditMessage, message]);

    useEffect(() => {
        if (onLoadingChange) {
            onLoadingChange(isAIResponding);
        }
    }, [isAIResponding, onLoadingChange]);

    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(messages);
        }
    }, [messages, onMessagesChange]);

    // ENHANCED: Better debugging
    useEffect(() => {
        console.log('=== STATE DEBUG ===');
        console.log('isAIResponding:', isAIResponding);
        console.log('isProcessingResponseRef:', isProcessingResponseRef.current);
        console.log('currentLoadingIdRef:', currentLoadingIdRef.current);
        console.log('Messages count:', messages.length);
        console.log('Loading messages:', messages.filter(m => m.isLoading).length);
        console.log('Subscription ready:', subscriptionReadyRef.current);
        console.log('==================');
    }, [isAIResponding, messages.length]);

    return {
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

        // Refs for external access
        flatListRef,

        // Mutation object for advanced usage
        sendMessageMutation,
    };
};

export default useRealtimeChat;
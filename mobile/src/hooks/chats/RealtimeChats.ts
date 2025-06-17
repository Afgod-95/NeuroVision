import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import supabase from '@/src/supabase/supabaseClient';
import axios from 'axios';
import { useMessageOptions } from '../UserMessageOptions';

// Types
interface Message {
    id: string;
    conversation_id?: string;
    user_id?: string;
    sender: 'user' | 'assistant' | 'system';
    text: string;
    created_at: string;
    timestamp: string;
    user: boolean;
    content?: MessageContent;
    isLoading?: boolean;
}

interface MessageContent {
    type: 'text' | 'audio' | 'mixed';
    text?: string;
    audioUrl?: string;
    audioName?: string;
    audioDuration?: number;
}

interface SupabaseMessage {
    id: string;
    conversation_id: string;
    user_id: string;
    sender: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

interface UploadedAudioFile {
    name?: string;
    duration?: number;
    uploadResult?: {
        signedUrl: string;
    };
}

interface RootState {
    user: {
        user: {
            id: string;
            username?: string;
        };
    };
    messageOptions: {
        messageId: string;
        isEdited: boolean;
    };
}

// Component Props
interface RealtimeChatProps {
    uniqueConvId: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    onMessagesChange?: (messages: Message[]) => void;
    onLoadingChange?: (loading: boolean) => void;
    initialMessages?: Message[];
    enableSampleMessages?: boolean;
}

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
    const aiResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Add a ref to track if we're currently processing an AI response
    const isProcessingResponseRef = useRef<boolean>(false);

    const { user: userDetails } = useSelector((state: RootState) => state.user);
    const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);
    const queryClient = useQueryClient();

    // Memoize username to prevent recalculation
    const username = useMemo(() => userDetails?.username?.split(" ")[0], [userDetails?.username]);

    // Helper function to clear AI responding state - FIXED VERSION
    const clearAIResponding = useCallback(() => {
        console.log('Clearing AI responding state');
        
        // Use functional updates to avoid stale state
        setIsAIResponding(prevState => {
            if (prevState) {
                console.log('AI responding state cleared');
            }
            return false;
        });
        
        // Clear timeout
        if (aiResponseTimeoutRef.current) {
            clearTimeout(aiResponseTimeoutRef.current);
            aiResponseTimeoutRef.current = null;
        }
        
        // Reset processing flag
        isProcessingResponseRef.current = false;
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

    // Memoized scroll to bottom function
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, []);

    // Set up realtime subscription - FIXED VERSION
    useEffect(() => {
        if (!conversationId || !userDetails?.id) return;

        // Clean up existing channel
        if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
        }

        // Create new channel
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
                    const transformedMessage: Message = {
                        id: newMessage.id,
                        conversation_id: newMessage.conversation_id,
                        user_id: newMessage.user_id,
                        sender: newMessage.sender,
                        text: newMessage.content,
                        created_at: newMessage.created_at,
                        timestamp: newMessage.created_at,
                        user: newMessage.sender === 'user',
                        content: (() => {
                            try {
                                return JSON.parse(newMessage.content);
                            } catch {
                                return { type: 'text', text: newMessage.content };
                            }
                        })(),
                    };

                    setMessages(prev => {
                        // Check if message already exists to prevent duplicates
                        const exists = prev.some(msg => msg.id === transformedMessage.id);
                        if (exists) return prev;

                        // For user messages, replace the temporary one we added
                        if (newMessage.sender === 'user' && pendingUserMessageRef.current) {
                            const withoutTemp = prev.filter(msg => msg.id !== pendingUserMessageRef.current);
                            pendingUserMessageRef.current = null;
                            return [...withoutTemp, transformedMessage];
                        }

                        // For AI messages, remove loading messages and clear AI responding state
                        if (newMessage.sender === 'assistant') {
                            console.log('AI message received, clearing loading state');
                            const withoutLoading = prev.filter(msg => !msg.isLoading);
                            
                            // IMPORTANT: Clear AI responding state immediately using setTimeout
                            // to ensure it runs after the current render cycle
                            setTimeout(() => {
                                clearAIResponding();
                            }, 0);
                            
                            return [...withoutLoading, transformedMessage];
                        }

                        return [...prev, transformedMessage];
                    });

                    // Scroll to bottom when new message arrives
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
                    const transformedMessage: Message = {
                        id: updatedMessage.id,
                        conversation_id: updatedMessage.conversation_id,
                        user_id: updatedMessage.user_id,
                        sender: updatedMessage.sender,
                        text: updatedMessage.content,
                        created_at: updatedMessage.created_at,
                        timestamp: updatedMessage.created_at,
                        user: updatedMessage.sender === 'user',
                        content: (() => {
                            try {
                                return JSON.parse(updatedMessage.content);
                            } catch {
                                return { type: 'text', text: updatedMessage.content };
                            }
                        })(),
                    };

                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === transformedMessage.id ? transformedMessage : msg
                        )
                    );

                    // If this is an assistant message update, clear AI responding state
                    if (updatedMessage.sender === 'assistant') {
                        setTimeout(() => {
                            clearAIResponding();
                        }, 0);
                    }
                }
            )
            .subscribe();

        realtimeChannelRef.current = channel;

        // Cleanup function
        return () => {
            if (realtimeChannelRef.current) {
                supabase.removeChannel(realtimeChannelRef.current);
                realtimeChannelRef.current = null;
            }
        };
    }, [conversationId, userDetails?.id, scrollToBottom, clearAIResponding]);

    // Function to save message to Supabase
    const saveMessageToSupabase = useCallback(async (
        messageText: string,
        sender: 'user' | 'assistant' | 'system',
        messageContent?: MessageContent
    ) => {
        if (!conversationId || !userDetails?.id) {
            throw new Error('Missing conversation ID or user ID');
        }

        // Prepare content - if messageContent exists, stringify it, otherwise use messageText
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

    // Updated mutation with proper user message handling - FIXED VERSION
    const sendMessageMutation = useMutation({
        mutationFn: async ({ messageText, audioFile }: { messageText: string, audioFile?: UploadedAudioFile }) => {
            let finalMessage = messageText;
            let messageContent: MessageContent | undefined;

            // Create message content based on what we have
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

            // Save user message to Supabase
            await saveMessageToSupabase(finalMessage, 'user', messageContent);

            // If there's an audio file, transcribe it first
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

            // Send message to AI API with new structure
            const response = await axios.post('/api/chats/send-message', {
                message: finalMessage,
                systemPrompt: systemPrompt,
                temperature: temperature,
                maxTokens: maxTokens,
                conversationId: conversationId,
                userId: userDetails?.id,
                useDatabase: true,
            });

            return {
                userMessage: finalMessage,
                aiResponse: response.data,
                originalAudioFile: audioFile,
                conversationId: response.data.conversationId
            };
        },
        onMutate: ({ messageText, audioFile }) => {
            console.log('Mutation started, setting AI responding to true');

            // Set processing flag
            isProcessingResponseRef.current = true;

            // 1. Add user message immediately to local state
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

            // 2. Add AI loading message
            const loadingMessage: Message = {
                id: `loading-${Date.now()}`,
                text: '',
                user: false,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                sender: 'assistant',
                isLoading: true
            };

            // Store the temp user message ID to replace it later
            pendingUserMessageRef.current = tempUserMessageId;

            // Add both messages to state
            setMessages(prev => [...prev, tempUserMessage, loadingMessage]);
            setIsAIResponding(true);

            // Set a timeout to clear AI responding state as a fallback
            // This ensures the loading state doesn't get stuck
            aiResponseTimeoutRef.current = setTimeout(() => {
                console.log('AI response timeout reached, clearing loading state');
                clearAIResponding();
            }, 30000); // 30 second timeout

            // Scroll to bottom
            scrollToBottom();
        },
        onSuccess: async (data) => {
            console.log('Message sent successfully:', data);

            // Update conversation ID if it was created/changed
            if (data.conversationId && data.conversationId !== conversationId) {
                setConversationId(data.conversationId);
            }

            // Save AI response to Supabase (will trigger realtime update)
            try {
                const aiResponseText = data.aiResponse.response ||
                    data.aiResponse.message ||
                    data.aiResponse.content ||
                    'I received your message.';

                console.log('Saving AI response to Supabase:', aiResponseText);
                await saveMessageToSupabase(aiResponseText, 'assistant');

                if (data.aiResponse.metadata) {
                    console.log('AI Response Metadata:', data.aiResponse.metadata);
                }

            } catch (error) {
                console.error('Failed to save AI response:', error);
                // Add error message locally if saving fails
                const errorMessage: Message = {
                    id: `error-${Date.now()}`,
                    text: 'Failed to save AI response. Please try again.',
                    user: false,
                    created_at: new Date().toISOString(),
                    timestamp: new Date().toISOString(),
                    sender: 'assistant'
                };

                setMessages(prev => {
                    const withoutLoading = prev.filter(msg => !msg.isLoading);
                    return [...withoutLoading, errorMessage];
                });

                // Clear AI responding state on error
                clearAIResponding();
            }

            // IMPORTANT: Don't clear isAIResponding here - let the realtime subscription handle it
            // This prevents race conditions where we might clear the state before the message arrives
        },
        onError: (error: any) => {
            console.error('Failed to send message:', error);

            // Remove loading message and add error message
            setMessages(prev => {
                const withoutLoading = prev.filter(msg => !msg.isLoading);

                let errorText = 'Sorry, I encountered an error processing your message.';

                // Handle specific error cases from your backend
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

            // Clear AI responding state and pending user message ref on error
            clearAIResponding();
            pendingUserMessageRef.current = null;
        }
    });

    // Updated handleSendMessage function - make it stable with useCallback
    const handleSendMessage = useCallback(async (messageText: string, audioFile?: UploadedAudioFile) => {
        console.log('handleSendMessage called with:', { messageText, audioFile });

        if (!messageText.trim() && !audioFile) {
            return;
        }

        // Prevent multiple simultaneous requests
        if (isProcessingResponseRef.current) {
            console.log('Already processing a response, ignoring request');
            return;
        }

        // Clear the input immediately
        setMessage('');

        // Send to AI via mutation (this will also save to Supabase)
        sendMessageMutation.mutate({ messageText, audioFile });
    }, [sendMessageMutation]);

    // function to start new conversation
    const startNewConversation = useCallback(() => {
        const newConvId = uniqueConvId
        setConversationId(newConvId);
        // Clear messages from UI
        setMessages([]);
        // Clear any pending user message reference
        pendingUserMessageRef.current = null;
        // Clear AI responding state
        clearAIResponding();
    }, [uniqueConvId, clearAIResponding]);

    // function to get conversation history from database
    const loadConversationHistory = useCallback(async (convId: string) => {
        try {
            // You might want to add an endpoint to fetch conversation history
            // const response = await axios.get(`/api/chat/conversation/${convId}`, {
            //   params: { userId: userDetails?.id }
            // });
            // return response.data.history;
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        }
    }, [userDetails?.id]);

    const handleRegenerate = useCallback(async (messageId: string) => {
        // Prevent regeneration if already processing
        if (isProcessingResponseRef.current) {
            console.log('Already processing a response, ignoring regenerate request');
            return;
        }

        const currentIndex = messages.findIndex(msg => msg.id === messageId);
        const previousUserMessage = messages.slice(0, currentIndex).reverse().find(msg => msg.user);

        if (previousUserMessage) {
            // Set processing flag
            isProcessingResponseRef.current = true;

            // Remove the AI message that we're regenerating
            setMessages(prev => prev.filter(msg => msg.id !== messageId));

            // Add loading message
            const loadingMessage: Message = {
                id: `loading-${Date.now()}`,
                text: '',
                user: false,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                sender: 'assistant',
                isLoading: true
            };

            setMessages(prev => [...prev, loadingMessage]);
            setIsAIResponding(true);

            // Set timeout as fallback
            aiResponseTimeoutRef.current = setTimeout(() => {
                console.log('Regenerate timeout reached, clearing loading state');
                clearAIResponding();
            }, 30000);

            try {
                // Call API directly without going through the mutation
                const response = await axios.post('/api/chats/send-message', {
                    message: previousUserMessage.text,
                    systemPrompt: systemPrompt,
                    temperature: temperature,
                    maxTokens: maxTokens,
                    conversationId: conversationId,
                    userId: userDetails?.id,
                    useDatabase: true,
                });

                // Save AI response to Supabase (will trigger realtime update)
                const aiResponseText = response.data.response ||
                    response.data.message ||
                    response.data.content ||
                    'I received your message.';

                await saveMessageToSupabase(aiResponseText, 'assistant');

            } catch (error) {
                console.error('Failed to regenerate message:', error);

                // Remove loading and add error message
                setMessages(prev => {
                    const withoutLoading = prev.filter(msg => !msg.isLoading);
                    const errorMessage: Message = {
                        id: `error-${Date.now()}`,
                        text: 'Failed to regenerate response. Please try again.',
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
    }, [messages, systemPrompt, temperature, maxTokens, conversationId, userDetails?.id, saveMessageToSupabase, clearAIResponding]);

    // Prefill message if it's edited
    useEffect(() => {
        if (isEdited && messageId) {
            setMessage(messageId);
        }
    }, [isEdited, messageId]);

    const { handleEditMessage } = useMessageOptions();
    // Stable callback for edit message
    const handleEditMessageCallback = useCallback(() => {
        handleEditMessage(message);
    }, [handleEditMessage, message]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (aiResponseTimeoutRef.current) {
                clearTimeout(aiResponseTimeoutRef.current);
            }
        };
    }, []);

    // Call onLoadingChange callback when isAIResponding changes
    useEffect(() => {
        if (onLoadingChange) {
            onLoadingChange(isAIResponding);
        }
    }, [isAIResponding, onLoadingChange]);

    // DEBUG: Log state changes
    useEffect(() => {
        console.log('isAIResponding changed:', isAIResponding);
    }, [isAIResponding]);

    // Return component API
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
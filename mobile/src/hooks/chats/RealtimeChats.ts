import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import supabase from '@/src/supabase/supabaseClient';
import axios from 'axios';
import { useMessageOptions } from '../UserMessageOptions';
import { useFetchMessagesMutation } from '../message/GetMessagesMutation';

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
    metadata?: any; // Add this line to allow metadata property
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
    const isProcessingResponseRef = useRef<boolean>(false);
    const processedMessageIds = useRef<Set<string>>(new Set()); // Track processed messages

    const { user: userDetails } = useSelector((state: RootState) => state.user);
    const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);
    const queryClient = useQueryClient();

    // Memoize username to prevent recalculation
    const username = useMemo(() => userDetails?.username?.split(" ")[0], [userDetails?.username]);

    // Helper function to clear AI responding state
    const clearAIResponding = useCallback(() => {
        console.log('Clearing AI responding state');

        setIsAIResponding(prevState => {
            if (prevState) {
                console.log('AI responding state cleared');
            }
            return false;
        });

        if (aiResponseTimeoutRef.current) {
            clearTimeout(aiResponseTimeoutRef.current);
            aiResponseTimeoutRef.current = null;
        }

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

    // Helper function to transform Supabase message
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

                    // Prevent duplicate processing
                    if (processedMessageIds.current.has(newMessage.id)) {
                        console.log('Message already processed, skipping:', newMessage.id);
                        return;
                    }
                    processedMessageIds.current.add(newMessage.id);

                    const transformedMessage = transformSupabaseMessage(newMessage);

                    setMessages(prev => {
                        // Double-check for existing message to prevent duplicates
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

                        // For AI messages, remove loading messages and clear AI responding state
                        if (newMessage.sender === 'assistant') {
                            console.log('AI message received, removing loading messages');
                            newMessages = newMessages.filter(msg => !msg.isLoading);

                            // Clear AI responding state
                            setTimeout(() => {
                                clearAIResponding();
                            }, 0);
                        }

                        return [...newMessages, transformedMessage];
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
                    const transformedMessage = transformSupabaseMessage(updatedMessage);

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
    }, [conversationId, userDetails?.id, scrollToBottom, clearAIResponding, transformSupabaseMessage]);

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
    

    // Function to extract AI response text with better fallbacks
    const extractAIResponseText = useCallback((aiResponse: any): string => {
        // Try multiple possible response fields
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

        // If aiResponse is a string itself
        if (typeof aiResponse === 'string' && aiResponse.trim()) {
            return aiResponse.trim();
        }

        // Log the full response for debugging
        console.log('AI Response structure:', JSON.stringify(aiResponse, null, 2));

        // Return a default message if no valid response found
        return 'I apologize, but I was unable to generate a proper response. Please try again.';
    }, []);

    // Updated mutation with better error handling and response extraction
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

            // Send message to AI API
            const response = await axios.post('/api/chats/send-message', {
                message: finalMessage,
                systemPrompt: systemPrompt,
                temperature: temperature,
                maxTokens: maxTokens,
                conversationId: conversationId,
                userId: userDetails?.id,
                useDatabase: true,
            });

            // Validate the AI response
            if (!response.data) {
                throw new Error('No response data received from AI service');
            }

            return {
                userMessage: finalMessage,
                aiResponse: response.data,
                originalAudioFile: audioFile,
                conversationId: response.data.conversationId,
                //savedUserMessage
            };
        },
        onMutate: ({ messageText, audioFile }) => {
            console.log('Mutation started, setting AI responding to true');

            // Prevent multiple simultaneous requests
            if (isProcessingResponseRef.current) {
                console.log('Already processing, cancelling new request');
                throw new Error('Already processing a request');
            }

            // Set processing flag
            isProcessingResponseRef.current = true;

            // Create temporary user message
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

            // Create loading message
            const loadingMessage: Message = {
                id: `loading-${Date.now()}`,
                text: '',
                user: false,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                sender: 'assistant',
                isLoading: true
            };

            // Store the temp user message ID
            pendingUserMessageRef.current = tempUserMessageId;

            // Add both messages to state
            setMessages(prev => [...prev, tempUserMessage, loadingMessage]);
            setIsAIResponding(true);

            // Set timeout as fallback
            aiResponseTimeoutRef.current = setTimeout(() => {
                console.log('AI response timeout reached, clearing loading state');
                clearAIResponding();
            }, 600000);

            scrollToBottom();
        },
        onSuccess: async (data) => {
            console.log('Message sent successfully:', data);

            // Update conversation ID if it was created/changed
            if (data.conversationId && data.conversationId !== conversationId) {
                setConversationId(data.conversationId);
            }

            try {
                // Extract AI response text with better error handling
                const aiResponseText = extractAIResponseText(data.aiResponse);

                if (!aiResponseText || aiResponseText.trim() === '') {
                    throw new Error('AI response is empty or invalid');
                }

                console.log('Saving AI response to Supabase:', aiResponseText);

                if (data.aiResponse.metadata) {
                    console.log('AI Response Metadata:', data.aiResponse.metadata);
                }

            } catch (error) {
                console.error('Failed to save AI response:', error);

                // Only handle errors manually since realtime won't trigger for failed saves
                setMessages(prev => prev.filter(msg => !msg.isLoading));

                const errorMessage: Message = {
                    id: `error-${Date.now()}`,
                    text: 'Failed to get a valid response from AI. Please try again.',
                    user: false,
                    created_at: new Date().toISOString(),
                    timestamp: new Date().toISOString(),
                    sender: 'assistant'
                };

                setMessages(prev => [...prev, errorMessage]);
                clearAIResponding();
            }
        },
        onError: (error: any) => {
            console.error('Failed to send message:', error);

            // Remove loading message and add error message
            setMessages(prev => {
                const withoutLoading = prev.filter(msg => !msg.isLoading);

                let errorText = 'Sorry, I encountered an error processing your message.';

                // Handle specific error cases
                if (error.message === 'Already processing a request') {
                    return prev; // Don't add error message for this case
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

            // Clear AI responding state and pending user message ref on error
            clearAIResponding();
            pendingUserMessageRef.current = null;
        }
    });

    // Updated handleSendMessage function
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

        // Send to AI via mutation
        sendMessageMutation.mutate({ messageText, audioFile });
    }, [sendMessageMutation]);

    // Function to start new conversation
    const startNewConversation = useCallback(() => {
        const newConvId = uniqueConvId;
        setConversationId(newConvId);
        setMessages([]);
        pendingUserMessageRef.current = null;
        processedMessageIds.current.clear(); // Clear processed message IDs
        clearAIResponding();
    }, [uniqueConvId, clearAIResponding]);

    
    // Function to get conversation history from database
    const loadConversationHistoryMutation = useFetchMessagesMutation();
    const loadConversationHistory = useCallback(async () => {
        try {
            loadConversationHistoryMutation.mutate(userDetails?.id)
            const { history } = await loadConversationHistoryMutation.data;
            setMessages(history);
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
                // api call for sending message
                const response = await axios.post('/api/chats/send-message', {
                    message: previousUserMessage.text,
                    systemPrompt: systemPrompt,
                    temperature: temperature,
                    maxTokens: maxTokens,
                    conversationId: conversationId,
                    userId: userDetails?.id,
                    useDatabase: true,
                });

                // Extract and validate AI response
                const aiResponseText = extractAIResponseText(response.data);

                if (!aiResponseText || aiResponseText.trim() === '') {
                    throw new Error('AI response is empty or invalid');
                }

                await saveMessageToSupabase(aiResponseText, 'assistant');

            } catch (error: any) {
                console.error('Failed to regenerate message:', error);

                // Determine a more specific error message
                let errorText = 'Failed to regenerate response. Please try again.';

                if (error.response) {
                    // Error returned from server
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
                    // No response received
                    errorText = 'No response from server. Please check your internet connection.';
                } else if (error.message && error.message.includes('timeout')) {
                    errorText = 'The request timed out. Please try again in a few moments.';
                } else if (error.message) {
                    // Fallback to general error message
                    errorText = `Error: ${error.message}`;
                }

                // Remove loading and add error message
                setMessages(prev => {
                    const withoutLoading = prev.filter(msg => !msg.isLoading);
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
    }, [messages, systemPrompt, temperature, maxTokens, conversationId, userDetails?.id, saveMessageToSupabase, clearAIResponding, extractAIResponseText]);

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

    // Call onMessagesChange callback when messages change
    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(messages);
        }
    }, [messages, onMessagesChange]);

    // DEBUG: Log state changes
    useEffect(() => {
        console.log('isAIResponding changed:', isAIResponding);
        console.log('Messages count:', messages.length);
    }, [isAIResponding, messages.length]);

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
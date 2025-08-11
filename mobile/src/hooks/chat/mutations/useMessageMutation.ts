import { useMutation } from "@tanstack/react-query"
import { Message, MessageContent, RootState } from "@/src/utils/interfaces/TypescriptInterfaces";
import { UploadedAudioFile } from "@/src/utils/interfaces/TypescriptInterfaces";
import api from "@/src/services/axiosClient";
import { useSelector } from "react-redux";


type sendMessageMutationType = {
    systemPrompt: string,
    temperature: any,
    maxTokens: number,
    conversationId: string,
    userDetails: any,
    isProcessingResponseRef: React.RefObject<boolean>,
    pendingUserMessageRef: React.RefObject<string | null>,
    currentLoadingIdRef: React.RefObject<string | null>,
    abortControllerRef: React.RefObject<AbortController | null>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setIsAIResponding: (isAIResponding: boolean) => void,
    setConversationId: (conversationId: string) => void,
   
    
    startTypingAnimation: ((aiResponseText: string, fallbackMessage: any) => void)
    clearAIResponding: () => void,
    extractAIResponseText: (aiResponse: any) => string,
    scrollToBottom: () => void,
}


 export const useMessageMutation = ({
    systemPrompt,
    temperature,
    maxTokens,
    conversationId,
    userDetails,
    isProcessingResponseRef,
    pendingUserMessageRef,
    currentLoadingIdRef,
    abortControllerRef,
    setMessages,
    setIsAIResponding,
    setConversationId,
    startTypingAnimation,
    clearAIResponding,
    extractAIResponseText,
    scrollToBottom
} : sendMessageMutationType ) => {

    const accessToken = useSelector((state: RootState) => state?.user);
    console.log(`Access Token Send message mutation: ${accessToken}`)

    const sendMessageMutation = useMutation({
        mutationFn: async ({ messageText, audioFile }: { messageText: string, audioFile?: UploadedAudioFile }) => {
            let finalMessage = messageText;
            let messageContent: MessageContent | undefined;

            abortControllerRef.current = new AbortController();

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

            

            const controller = new AbortController();
            abortControllerRef.current = controller;

            const payload = {
                message: finalMessage,
                messageContent,
                systemPrompt,
                temperature,
                maxTokens,
                conversationId,
                userDetails
            };

         
            const response = await api.post("/api/conversations/send-message", payload, {
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });


            // Clear the abort controller after the request completes
            abortControllerRef.current = null;

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

                // Fallback in case realtime doesn't work - but no timeout
                    if (isProcessingResponseRef.current) {
                        console.log('Realtime fallback: manually clearing loading state');
                        clearAIResponding();

                        setMessages(prev => {
                            const withoutLoading = prev.filter(msg => !msg.isLoading);

                            const responseExists = prev.some(msg =>
                                msg.sender === 'assistant' &&
                                msg.text === aiResponseText &&
                                !msg.isLoading
                            );

                            if (!responseExists) {
                                const fallbackMessage: Message = {
                                    id: `fallback-${Date.now()}`,
                                    text: '',
                                    user: false,
                                    created_at: new Date().toISOString(),
                                    timestamp: new Date().toISOString(),
                                    sender: 'assistant',
                                    isTyping: true
                                };

                                // Start typing animation for fallback message
                                setTimeout(() => {
                                    startTypingAnimation(aiResponseText, fallbackMessage.id);
                                }, 100);

                                return [...withoutLoading, fallbackMessage];
                            }

                            return withoutLoading;
                        });
                    };
               

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

    return {
        sendMessageMutation
    }
}
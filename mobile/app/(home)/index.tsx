import {
  View,
  Text,
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Platform,
  FlatList
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Colors } from '@/src/constants/Colors';
import ChatInput from '@/src/components/textInputs/ChatInput';
import CustomSideBar from '@/src/components/sidebar/CustomSideBar';
import { useDispatch } from 'react-redux';
import { logout } from '@/src/redux/slices/authSlice';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import UserMessageBox, { MessagePreview, MessageContent } from '@/src/components/messages/UserMessageBox';
import AdvancedAIResponse from '@/src/components/messages/AIResponse';
import { useMessageOptions } from '@/src/hooks/UserMessageOptions';
import { fetchUserMessages } from '@/src/services/message';
import { UploadedAudioFile as OriginalUploadedAudioFile } from '@/src/components/textInputs/ChatInput';
import supabase from '@/src/supabase/supabaseClient';
import axios from 'axios';

// Extend UploadedAudioFile to include duration
type UploadedAudioFile = OriginalUploadedAudioFile & {
  duration?: number;
};

// Enhanced message types to include content and match database schema
interface Message {
  id: string;
  conversation_id?: string;
  user_id?: number;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  content?: MessageContent;
  created_at: string;
  timestamp?: string;
  user: boolean; // Keep for backward compatibility
  isLoading?: boolean;
}

// Supabase message type matching your database schema
interface SupabaseMessage {
  id: string;
  conversation_id: string;
  user_id: number;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

const Index = () => {
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAIResponding, setIsAIResponding] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  const realtimeChannelRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const { user: userDetails } = useSelector((state: RootState) => state.user);
  const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions);
  const queryClient = useQueryClient();

  // Generate or get conversation ID
  useEffect(() => {
    if (userDetails?.id) {
      // For now, using a simple conversation ID based on user ID
      // In production, you might want to create separate conversations
      const convId = `conv_${userDetails.id}_main`;
      setConversationId(convId);
    }
  }, [userDetails?.id]);

  // Fetch initial messages from Supabase
  useEffect(() => {
    const fetchInitialMessages = async () => {
      if (!conversationId || !userDetails?.id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
        } else {
          // Transform Supabase messages to our Message format
          const transformedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            user_id: msg.user_id,
            sender: msg.sender,
            text: msg.content,
            created_at: msg.created_at,
            timestamp: msg.created_at,
            user: msg.sender === 'user',
            // Parse content if it's JSON for rich messages
            content: (() => {
              try {
                return JSON.parse(msg.content);
              } catch {
                return { type: 'text', text: msg.content };
              }
            })(),
          }));
          
          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error('Failed to fetch initial messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMessages();
  }, [conversationId, userDetails?.id]);

  // Set up realtime subscription
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
          
          // Don't add the message if it's from the current user and already exists locally
          // This prevents duplicate messages when user sends
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
            
            // Remove any loading messages if this is an AI response
            if (newMessage.sender === 'assistant') {
              const withoutLoading = prev.filter(msg => !msg.isLoading);
              return [...withoutLoading, transformedMessage];
            }
            
            return [...prev, transformedMessage];
          });

          // Scroll to bottom when new message arrives
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
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
  }, [conversationId, userDetails?.id]);

  // Function to save message to Supabase
  const saveMessageToSupabase = async (
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
  };

  // Updated mutation with realtime integration
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

      // Save user message to Supabase (will trigger realtime update)
      await saveMessageToSupabase(finalMessage, 'user', messageContent);

      // If there's an audio file, transcribe it first
      if (audioFile && userDetails?.id) {
        try {
          console.log('Starting audio transcription...');
          
          if (!audioFile.uploadResult?.signedUrl) {
            throw new Error('No audio URL available for transcription');
          }

          const transcriptionResult = await axios.post('/api/user/transcribe-audio', {
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
        } catch (transcriptionError: any) {
          console.error('Transcription error:', transcriptionError);
          throw new Error(`Transcription failed: ${transcriptionError.message}`);
        }
      }

      // Send message to AI API
      const response = await axios.post('/api/chat/send-message', {
        userId: userDetails?.id,
        message: finalMessage,
        conversationId: conversationId
      });

      return { userMessage: finalMessage, aiResponse: response.data, originalAudioFile: audioFile };
    },
    onMutate: () => {
      // Add loading message immediately
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        text: 'Processing...',
        user: false,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        sender: 'assistant',
        isLoading: true
      };

      setMessages(prev => [...prev, loadingMessage]);
      setIsAIResponding(true);
    },
    onSuccess: async (data) => {
      console.log('Message sent successfully:', data);

      // Save AI response to Supabase (will trigger realtime update)
      try {
        await saveMessageToSupabase(
          data.aiResponse.message || data.aiResponse.content || 'I received your message.',
          'assistant'
        );
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
      }

      setIsAIResponding(false);
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);

      // Remove loading message and add error message
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);

        let errorText = 'Sorry, I encountered an error processing your message.';
        if (error.message.includes('Transcription')) {
          errorText = `Audio transcription error: ${error.message}`;
        } else if (error.response?.status === 404) {
          errorText = 'Service not found. Please check your API configuration.';
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

      setIsAIResponding(false);
    }
  });

  // Prefill message if it's edited
  useEffect(() => {
    if (isEdited && messageId) {
      setMessage(messageId);
    }
  }, [isEdited, messageId]);

  const { handleEditMessage } = useMessageOptions();

  if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const handleMessageOnChange = (text: string) => {
    setMessage(text);
  };

  const handleIsRecording = (isRecording: boolean) => {
    setIsRecording(isRecording);
  };

  // Updated handleSendMessage function
  const handleSendMessage = async (messageText: string, audioFile?: UploadedAudioFile) => {
    console.log('handleSendMessage called with:', { messageText, audioFile });

    if (!messageText.trim() && !audioFile) {
      return;
    }

    // Clear the input immediately
    setMessage('');

    // Send to AI via mutation (this will also save to Supabase)
    sendMessageMutation.mutate({ messageText, audioFile });
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Username extraction
  const username = userDetails?.username?.split(" ")[0];

  return (
    <>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          {/* Background Image */}
          <Image
            source={require('@/src/assets/images/CircularGradient.png')}
            style={styles.backgroundImage}
          />

          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <SafeAreaView style={styles.safeAreaContainer}>
              {/* Header - Fixed at top */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                  setIsSidebarVisible(true);
                }}>
                  <Image
                    source={require('@/src/assets/images/menu.png')}
                    style={styles.menuIcon}
                  />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>NeuroVision</Text>
                <View style={{ width: 30, height: 30 }} />
              </View>

              {/* Content Area - Show welcome or messages */}
              {loading ? (
                <View style={styles.contentArea}>
                  <Text style={styles.subText}>Loading messages...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.contentArea}>
                  <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>
                      Hello {username} 👋{'\n'}
                      <Text style={styles.boldText}>I&apos;m NeuroVision, your AI assistant.</Text>
                    </Text>
                    <Text style={styles.subText}>
                      How may I help you today?
                    </Text>
                  </View>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 100
                  }}
                  onContentSizeChange={() => {
                    // Auto-scroll to bottom when content changes
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }}
                  renderItem={({ item }) =>
                    item.user ? (
                      <UserMessageBox
                        message={item.text}
                        messageId={item.id}
                        userMessage={true}
                        messageContent={item.content}
                      />
                    ) : (
                      <AdvancedAIResponse
                        message={item.text}
                        loading={item.isLoading || false}
                        onRegenerate={() => {
                          if (!item.isLoading) {
                            const currentIndex = messages.findIndex(msg => msg.id === item.id);
                            const previousUserMessage = messages.slice(0, currentIndex).reverse().find(msg => msg.user);

                            if (previousUserMessage) {
                              handleSendMessage(previousUserMessage.text);
                            }
                          }
                        }}
                      />
                    )
                  }
                />
              )}
            </SafeAreaView>

            {/* USER MESSAGE PREVIEW */}
            <MessagePreview
              message={messageId ?? ''}
              messageId={messageId ?? ''}
              userMessage={true}
              editMessage={() => handleEditMessage(message)}
            />

            {/* Chat input */}
            <ChatInput
              message={message}
              setMessage={handleMessageOnChange}
              isRecording={isRecording}
              setIsRecording={handleIsRecording}
              isEdited={isEdited}
              onSendMessage={handleSendMessage}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <CustomSideBar
        isVisible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        onOpen={() => setIsSidebarVisible(true)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgPrimary,
  },
  backgroundImage: {
    position: 'absolute',
    top: -150,
    right: -170,
    width: 500,
    height: 500,
    zIndex: -1,
  },
  keyboardContainer: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 30,
    height: 30,
  },
  headerTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 28,
    color: Colors.dark.txtPrimary,
  },
  welcomeText: {
    fontSize: 24,
    color: Colors.dark.button,
    textAlign: 'center',
    fontFamily: 'Manrope-ExtraBold',
  },
  boldText: {
    color: Colors.dark.txtPrimary,
  },
  subText: {
    fontFamily: 'Manrope-Medium',
    color: Colors.dark.txtSecondary,
    marginTop: 10,
    fontSize: 16,
  },
});

export default Index;
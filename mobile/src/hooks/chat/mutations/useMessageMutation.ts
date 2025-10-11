import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { Message, MessageContent, UploadedAudioFile, UploadedFile } from "@/src/utils/interfaces/TypescriptInterfaces";
import api from "@/src/services/axiosClient";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  addMessage, updateMessage, setIsAIResponding, setConversationId, removeMessage
} from "@/src/redux/slices/chatSlice";
import { useDispatch, useSelector } from "react-redux";
import { base64ToBlob } from "@/src/utils/helpers/base64ToBlob";

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

  startTypingAnimation: (aiResponseText: string, messageId: string) => void,
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
  startTypingAnimation,
  clearAIResponding,
  extractAIResponseText,
  scrollToBottom
}: sendMessageMutationType) => {

  const { accessToken } = useSelector((state: RootState) => state?.auth);
  const messages = useSelector((state: RootState) => state.chat?.messages || []);
  const dispatch = useDispatch<AppDispatch>();

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      messageText, 
      audioFile, 
      files 
    }: { 
      messageText: string, 
      audioFile?: UploadedAudioFile,
      files?: UploadedFile[]
    }) => {
      try {
        let finalMessage = messageText;
        let messageContent: MessageContent | undefined;

        // Create fresh AbortController
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Handle audio file
        if (audioFile) {
          messageContent = {
            type: messageText.trim() ? 'mixed' : 'audio',
            text: messageText.trim() || undefined,
            audioUrl: audioFile.uploadResult?.signedUrl,
            audioName: audioFile?.name || 'Voice message',
            audioDuration: audioFile.duration ? audioFile.duration * 1000 : undefined,
          };
          finalMessage = messageText.trim() || 'Voice message';
        } 
        // Handle regular files - STORE FULL FILE DATA
        else if (files && files.length > 0) {
          messageContent = {
            type: messageText.trim() ? 'mixed' : 'files',
            text: messageText.trim() || undefined,
            files: files.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type,
              size: f.size,
              uri: f.uri,
              base64: f.base64,
            })),
          };
          
          // If no text message, create a default one
          if (!messageText.trim()) {
            finalMessage = `Sent ${files.length} file${files.length > 1 ? 's' : ''}`;
          }
        } 
        // Handle text only
        else if (messageText.trim()) {
          messageContent = { type: 'text', text: messageText };
        }

        console.log("📨 Preparing request:", {
          message: finalMessage,
          conversationId,
          hasAudio: !!audioFile,
          filesCount: files?.length || 0,
          fileNames: files?.map(f => f.name)
        });

        const hasFiles = files && files.length > 0;
        const endpoint = "/api/conversations/send-message";
        
        let response;
        
        if (hasFiles) {
          // Use FormData for file uploads
          const formData = new FormData();
          
          // Add text fields
          formData.append('message', finalMessage);
          formData.append('useDatabase', 'true');
          formData.append('temperature', temperature.toString());
          formData.append('maxTokens', maxTokens.toString());
          formData.append('systemPrompt', systemPrompt);
          
          if (conversationId) {
            formData.append('conversationId', conversationId);
          }
          
          // Add conversation history (last 10 messages)
          const conversationHistory = messages.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));
          formData.append('conversationHistory', JSON.stringify(conversationHistory));

          // Add files
          for (const file of files) {
            if (file.uri) {
              const fileData: any = {
                uri: file.uri,
                type: file.type || 'application/octet-stream',
                name: file.name || `file_${Date.now()}`,
              };
              formData.append('files', fileData);
            } else if (file.base64) {
              const blob = base64ToBlob(file.base64, file.type);
              formData.append('files', blob, file.name);
            }
          }

          console.log("Sending FormData request with files");

          response = await api.post(
            endpoint,
            formData,
            {
              signal: controller.signal,
              headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'multipart/form-data',
              },
              timeout: 120000, 
            }
          );
        } else {
          // Use regular JSON for text-only messages
          const payload = {
            message: finalMessage,
            messageContent,
            systemPrompt,
            temperature,
            maxTokens,
            conversationId,
            userDetails,
            useDatabase: true,
          };

          console.log("📤 Sending JSON request (no files)");

          response = await api.post(endpoint, payload, {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 30000,
          });
        }

        if (!response.data) {
          throw new Error("No response data received from AI service");
        }

        console.log(`✅ Response received:`, {
          success: response.data.success,
          hasResponse: !!response.data.response,
          conversationId: response.data.conversationId
        });

        return {
          userMessage: finalMessage,
          aiResponse: response.data,
          originalAudioFile: audioFile,
          originalFiles: files,
          originalMessageText: messageText,
          conversationId: response.data.conversationId,
        };
      } catch (error) {
        console.log("❌ MutationFn error:", error);
        throw error;
      }
    },

    onMutate: ({ messageText, audioFile, files }) => {
      // check if already processing
      if (isProcessingResponseRef.current) {
        console.log("⚠️ Already processing a request");
        throw new Error("Already processing a request");
      }

      console.log("🚀 Starting new message mutation");

      isProcessingResponseRef.current = true;

      const tempUserMessageId = `temp-user-${Date.now()}`;
      let finalMessage = messageText;
      let messageContent: MessageContent | undefined;

      // Handle audio file
      if (audioFile) {
        messageContent = {
          type: messageText.trim() ? "mixed" : "audio",
          text: messageText.trim() || undefined,
          audioUrl: audioFile.uploadResult?.signedUrl,
          audioName: audioFile?.name || "Voice message",
          audioDuration: audioFile.duration ? audioFile.duration * 1000 : undefined,
        };
        finalMessage = messageText.trim() || "Voice message";
      } 
      // Handle regular files - STORE COMPLETE FILE DATA
      else if (files && files.length > 0) {
        messageContent = {
          type: messageText.trim() ? "mixed" : "files",
          text: messageText.trim() || undefined,
          files: files.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            size: f.size,
            uri: f.uri,        // KEEP URI
            base64: f.base64,  // KEEP BASE64
          })),
        };
        
        if (!messageText.trim()) {
          finalMessage = `Sent ${files.length} file${files.length > 1 ? 's' : ''}`;
        }
      } 
      // Handle text only
      else if (messageText.trim()) {
        messageContent = { type: "text", text: messageText };
      }

      const tempUserMessage: Message = {
        id: tempUserMessageId,
        text: finalMessage,
        user: true,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        sender: "user",
        content: messageContent,
      };

      const loadingMessageId = `loading-${Date.now()}`;
      const loadingMessage: Message = {
        id: loadingMessageId,
        text: "",
        user: false,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        sender: "assistant",
        isLoading: true,
      };

      pendingUserMessageRef.current = tempUserMessageId;
      currentLoadingIdRef.current = loadingMessageId;

      console.log("📝 Adding messages:", {
        userMsgId: tempUserMessageId,
        loadingMsgId: loadingMessageId,
        hasFiles: !!(files && files.length > 0),
        filesCount: files?.length || 0
      });
      
      dispatch(addMessage(tempUserMessage));
      dispatch(addMessage(loadingMessage));
      dispatch(setIsAIResponding(true));

      setTimeout(scrollToBottom, 50);

      return { tempUserMessageId, loadingMessageId };
    },

    onSuccess: async (data, variables, context) => {
      console.log("✅ Message sent successfully");

      const loadingId = context?.loadingMessageId || currentLoadingIdRef.current;

      // Reset processing flag
      isProcessingResponseRef.current = false;
      abortControllerRef.current = null;

      if (data.conversationId && data.conversationId !== conversationId) {
        console.log("🔄 Updating conversation ID:", data.conversationId);
        dispatch(setConversationId(data.conversationId));
      }

      try {
        const aiResponseText = extractAIResponseText(data.aiResponse);

        if (!aiResponseText?.trim()) {
          console.error("❌ AI response is empty");
          throw new Error("AI response is empty or invalid");
        }

        console.log(`📥 AI response received (${aiResponseText.length} chars)`);

        // CRITICAL: Remove loading message first, then add typing message
        if (loadingId) {
          console.log("🗑️ Removing loading message:", loadingId);
          dispatch(removeMessage(loadingId));
          
          // Small delay to ensure removal completes
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Create new typing message
          const typingMessageId = `typing-${Date.now()}`;
          const typingMessage: Message = {
            id: typingMessageId,
            text: "",
            user: false,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            sender: "assistant",
            isTyping: true,
          };
          
          console.log("✍️ Adding typing message:", typingMessageId);
          dispatch(addMessage(typingMessage));
          
          // Update current loading ID to new typing ID
          currentLoadingIdRef.current = typingMessageId;
          
          // Start typing animation
          setTimeout(() => {
            startTypingAnimation(aiResponseText, typingMessageId);
          }, 100);
        }

        // Clear refs
        pendingUserMessageRef.current = null;

      } catch (err) {
        console.error("⚠️ Failed to process AI response:", err);

        if (loadingId) {
          dispatch(updateMessage({
            id: loadingId,
            updates: {
              isLoading: false,
              isTyping: false,
              text: "Failed to get a valid response from AI. Please try again."
            }
          }));
        }
       
        clearAIResponding();
        pendingUserMessageRef.current = null;
        currentLoadingIdRef.current = null;
        
        setTimeout(() => {
          scrollToBottom()
        }, 100);
      }
    },

    onError: (error: any, variables, context) => {
      console.log("❌ Message mutation error");
      
      isProcessingResponseRef.current = false;
      abortControllerRef.current = null;

      const loadingId = context?.loadingMessageId || currentLoadingIdRef.current;

      // Handle canceled requests
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log("Request was canceled");
        
        // Remove loading message
        if (loadingId) {
          dispatch(removeMessage(loadingId));
        }
        
        clearAIResponding();
        pendingUserMessageRef.current = null;
        currentLoadingIdRef.current = null;
        return;
      }

      let errorText = "Sorry, I encountered an error processing your message.";

      if (error.message === "Already processing a request") return;

      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        if (backendError.includes("Message is required")) errorText = "Please provide a message or files to send.";
        else if (backendError.includes("Message is too long")) errorText = "Your message is too long. Please shorten it and try again.";
        else if (backendError.includes("userId is required")) errorText = "Authentication error. Please log in again.";
        else if (backendError.includes("Invalid conversation ID")) errorText = "Conversation error. Starting a new conversation.";
        else if (backendError.includes("Invalid user ID")) errorText = "User authentication error. Please log in again.";
        else if (backendError.includes("API quota exceeded")) errorText = "Service temporarily unavailable. Please try again later.";
        else if (backendError.includes("Database error")) errorText = "Database connection error. Please try again.";
        else if (backendError.includes("Failed to get response from Gemini")) errorText = "AI service temporarily unavailable. Please try again.";
        else if (backendError.includes("file")) errorText = "File processing error. Please check your files and try again.";
        else if (backendError.includes("Maximum")) errorText = backendError;
        else if (backendError.includes("exceeds")) errorText = backendError;
        else errorText = backendError;
      } else if (error.message.includes("Transcription")) {
        errorText = `Audio transcription error: ${error.message}`;
      } else if (error.response?.status === 400) errorText = "Invalid request. Please check your input and try again.";
      else if (error.response?.status === 404) errorText = "Service not found. Please check your API configuration.";
      else if (error.response?.status === 413) errorText = "Files are too large. Please reduce file size and try again.";
      else if (error.response?.status === 429) errorText = "Too many requests. Please wait a moment and try again.";
      else if (error.response?.status === 500) errorText = "Server error. Please try again in a moment.";
      else if (error.message) errorText = `Error: ${error.message}`;

      console.log("💬 Error:", errorText);

      if (loadingId) {
        dispatch(updateMessage({
          id: loadingId,
          updates: { isLoading: false, isTyping: false, text: errorText }
        }));
      } else {
        dispatch(addMessage({
          id: `error-${Date.now()}`,
          text: errorText,
          user: false,
          created_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          sender: "assistant"
        }));
      }

      clearAIResponding();
      pendingUserMessageRef.current = null;
      currentLoadingIdRef.current = null;
    }
  });

  return { sendMessageMutation };
};


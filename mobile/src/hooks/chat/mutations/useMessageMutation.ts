import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { Message, MessageContent, UploadedAudioFile } from "@/src/utils/interfaces/TypescriptInterfaces";
import api from "@/src/services/axiosClient";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  addMessage, updateMessage, setIsAIResponding, setConversationId,
} from "@/src/redux/slices/chatSlice";
import { useDispatch, useSelector } from "react-redux";

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
    mutationFn: async ({ messageText, audioFile }: { messageText: string, audioFile?: UploadedAudioFile }) => {
      try {
        let finalMessage = messageText;
        let messageContent: MessageContent | undefined;

        // Create fresh AbortController
        const controller = new AbortController();
        abortControllerRef.current = controller;

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
          messageContent = { type: 'text', text: messageText };
        }

        const payload = {
          message: finalMessage,
          messageContent,
          systemPrompt,
          temperature,
          maxTokens,
          conversationId,
          userDetails,
          useDatabase: true
        };

        console.log("📨 Sending message to backend:", {
          message: finalMessage,
          conversationId,
          hasAudio: !!audioFile
        });

        const response = await api.post("/api/conversations/send-message", payload, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 30000,
        });

        if (!response.data) {
          throw new Error("No response data received from AI service");
        }

        console.log("✅ Response received from backend");

        return {
          userMessage: finalMessage,
          aiResponse: response.data,
          originalAudioFile: audioFile,
          conversationId: response.data.conversationId,
        };
      } catch (error) {
        console.log("❌ MutationFn error:", error);
        throw error;
      }
    },

    onMutate: ({ messageText, audioFile }) => {
      // Cancel any existing request first
      if (abortControllerRef.current) {
        console.log("⚠️ Aborting previous request");
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (isProcessingResponseRef.current) {
        console.log("⚠️ Already processing a request");
        throw new Error("Already processing a request");
      }

      console.log("🚀 Starting new message mutation");

      isProcessingResponseRef.current = true;

      const tempUserMessageId = `temp-user-${Date.now()}`;
      let finalMessage = messageText;
      let messageContent: MessageContent | undefined;

      if (audioFile) {
        messageContent = {
          type: messageText.trim() ? "mixed" : "audio",
          text: messageText.trim() || undefined,
          audioUrl: audioFile.uploadResult?.signedUrl,
          audioName: audioFile?.name || "Voice message",
          audioDuration: audioFile.duration ? audioFile.duration * 1000 : undefined,
        };
        finalMessage = messageText.trim() || "Voice message";
      } else if (messageText.trim()) {
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

      console.log("📝 Adding user message and loading message to Redux");
      dispatch(addMessage(tempUserMessage));
      dispatch(addMessage(loadingMessage));
      dispatch(setIsAIResponding(true));

      setTimeout(scrollToBottom, 50);
    },

    onSuccess: async (data) => {
      console.log("✅ Message sent successfully");
      isProcessingResponseRef.current = false;
      abortControllerRef.current = null;

      if (data.conversationId && data.conversationId !== conversationId) {
        console.log("🔄 Updating conversation ID:", data.conversationId);
        dispatch(setConversationId(data.conversationId));
      }

      try {
        const aiResponseText = extractAIResponseText(data.aiResponse);

        if (!aiResponseText?.trim()) {
          throw new Error("AI response is empty or invalid");
        }

        console.log(`📥 AI response received (${aiResponseText.length} chars)`);

        if (currentLoadingIdRef.current) {
          // Update the loading message to show it's now typing
          console.log("🎬 Starting typing animation");
          
          dispatch(updateMessage({
            id: currentLoadingIdRef.current,
            updates: { isLoading: false, isTyping: true, text: "" }
          }));

          // Start typing animation which will update Redux with the text
          setTimeout(() => {
            if (currentLoadingIdRef.current) {
              startTypingAnimation(aiResponseText, currentLoadingIdRef.current);
            }
          }, 100);
        }

        // Clear AI responding state after a short delay to allow typing to start
        setTimeout(() => {
          clearAIResponding();
        }, 200);

      } catch (err) {
        console.error("⚠️ Failed to process AI response:", err);

        if (currentLoadingIdRef.current) {
          dispatch(updateMessage({
            id: currentLoadingIdRef.current,
            updates: {
              isLoading: false,
              isTyping: false,
              text: "Failed to get a valid response from AI. Please try again."
            }
          }));
        }
        clearAIResponding();
      }
    },

    onError: (error: any) => {
      console.error("❌ Failed to send message:", error);
      
      isProcessingResponseRef.current = false;
      abortControllerRef.current = null;

      // Handle canceled requests gracefully
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log("⚠️ Request was canceled - cleaning up");
        
        // Remove loading and pending messages
        if (currentLoadingIdRef.current || pendingUserMessageRef.current) {
          console.log("🗑️ Removing canceled messages from Redux");
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
        if (backendError.includes("Message is required")) errorText = "Please provide a message to send.";
        else if (backendError.includes("Message is too long")) errorText = "Your message is too long. Please shorten it and try again.";
        else if (backendError.includes("userId is required")) errorText = "Authentication error. Please log in again.";
        else if (backendError.includes("Invalid conversation ID")) errorText = "Conversation error. Starting a new conversation.";
        else if (backendError.includes("Invalid user ID")) errorText = "User authentication error. Please log in again.";
        else if (backendError.includes("API quota exceeded")) errorText = "Service temporarily unavailable. Please try again later.";
        else if (backendError.includes("Database error")) errorText = "Database connection error. Please try again.";
        else if (backendError.includes("Failed to get response from Gemini")) errorText = "AI service temporarily unavailable. Please try again.";
        else errorText = backendError;
      } else if (error.message.includes("Transcription")) {
        errorText = `Audio transcription error: ${error.message}`;
      } else if (error.response?.status === 400) errorText = "Invalid request. Please check your input and try again.";
      else if (error.response?.status === 404) errorText = "Service not found. Please check your API configuration.";
      else if (error.response?.status === 429) errorText = "Too many requests. Please wait a moment and try again.";
      else if (error.response?.status === 500) errorText = "Server error. Please try again in a moment.";
      else if (error.message) errorText = `Error: ${error.message}`;

      console.log("💬 Showing error message:", errorText);

      if (currentLoadingIdRef.current) {
        dispatch(updateMessage({
          id: currentLoadingIdRef.current,
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
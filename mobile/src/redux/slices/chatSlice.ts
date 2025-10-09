import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '@/src/utils/interfaces/TypescriptInterfaces';

interface ChatState {
  isSidebarVisible: boolean;
  message: string;
  isRecording: boolean;
  messages: Message[];
  isAIResponding: boolean;
  conversationId: string;
  loading: boolean;
  isTyping: boolean;
  isAborted: boolean;
  showAIButtonAction: boolean;
  openBottomSheet: boolean;
  attachments: any[];
  newChat: boolean;
}

const initialState: ChatState = {
  isSidebarVisible: false,
  message: '',
  isRecording: false,
  messages: [],
  isAIResponding: false,
  conversationId: '',
  loading: false,
  isTyping: false,
  isAborted: false,
  showAIButtonAction: false,
  openBottomSheet: false,
  attachments: [],
  newChat: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSidebarVisible: (state, action: PayloadAction<boolean>) => {
      state.isSidebarVisible = action.payload;
    },
    setMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    },
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) => {
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload.updates };
      }
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },
    setIsAIResponding: (state, action: PayloadAction<boolean>) => {
      state.isAIResponding = action.payload;
    },
    setConversationId: (state, action: PayloadAction<string>) => {
      state.conversationId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setIsTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setIsAborted: (state, action: PayloadAction<boolean>) => {
      state.isAborted = action.payload;
    },
    setShowAIButtonAction: (state, action: PayloadAction<boolean>) => {
      state.showAIButtonAction = action.payload;
    },
    setOpenBottomSheet: (state, action: PayloadAction<boolean>) => {
      state.openBottomSheet = action.payload;
    },
    setAttachments: (state, action: PayloadAction<any[]>) => {
      state.attachments = action.payload;
    },
    addAttachment: (state, action: PayloadAction<any>) => {
      state.attachments.push(action.payload);
    },
    removeAttachment: (state, action: PayloadAction<number>) => {
      state.attachments.splice(action.payload, 1);
    },
    clearAttachments: (state) => {
      state.attachments = [];
    },
    setNewChat: (state, action: PayloadAction<boolean>) => {
      state.newChat = action.payload;
    },
    resetChatState: (state) => {
      return { ...initialState };
    },
    clearMessages: (state) => {
      state.messages = [];
      state.message = '';
      state.loading = false;
      state.isAIResponding = false;
      state.isTyping = false;
      state.isAborted = false;
      state.attachments = [];
    },
  },
});

export const {
  setSidebarVisible,
  setMessage,
  setIsRecording,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  setIsAIResponding,
  setConversationId,
  setLoading,
  setIsTyping,
  setIsAborted,
  setShowAIButtonAction,
  setOpenBottomSheet,
  setAttachments,
  addAttachment,
  removeAttachment,
  clearAttachments,
  setNewChat,
  resetChatState,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
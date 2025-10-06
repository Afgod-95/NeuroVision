// src/redux/slices/messageOptionsSlice.ts
import { Message } from '@/src/utils/interfaces/TypescriptInterfaces';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TouchPos {
  x: number;
  y: number;
}

interface MessageOptionsState {
  showOptions: boolean;
  touchPos: TouchPos;
  showAbove: boolean;
  message: string | null;
  isEdited: boolean;
  messageId: string | null;
  editingMessage: Message | null;
}

const initialState: MessageOptionsState = {
  showOptions: false,
  touchPos: { x: 0, y: 0 },
  showAbove: false,
  message: null,
  messageId: null,
  isEdited: false,
  editingMessage: null,
};

export const messageOptionsSlice = createSlice({
  name: 'messageOptions',
  initialState,
  reducers: {
    setShowOptions: (state, action: PayloadAction<boolean>) => {
      state.showOptions = action.payload;
    },
    setTouchPos: (state, action: PayloadAction<TouchPos>) => {
      state.touchPos = action.payload;
    },
    setShowAbove: (state, action: PayloadAction<boolean>) => {
      state.showAbove = action.payload;
    },
    setMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    },
    setEditingMessage: (state, action: PayloadAction<Message | null>) => {
      state.editingMessage = action.payload;
    },
    setMessageId: (state, action: PayloadAction<string>) => {
      state.messageId = action.payload;
    },
    // Fixed: renamed from 'isEdited' to 'setIsEdited' to follow naming convention
    setIsEdited: (state, action: PayloadAction<boolean>) => {
      state.isEdited = action.payload;
    },
    resetOptions: () => initialState,
  },
});

export const {
  setShowOptions,
  setTouchPos,
  setShowAbove,
  setMessage,
  setMessageId,
  setIsEdited, 
  setEditingMessage,
  resetOptions,
} = messageOptionsSlice.actions;

export default messageOptionsSlice.reducer;
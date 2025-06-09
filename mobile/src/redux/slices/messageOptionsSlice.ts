// src/redux/slices/messageOptionsSlice.ts
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
  isEdited: boolean,
  messageId: string | null; 
}

const initialState: MessageOptionsState = {
  showOptions: false,
  touchPos: { x: 0, y: 0 },
  showAbove: false,
  message: null,
  messageId: null, 
  isEdited: false,
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
    setMessageId: (state, action: PayloadAction<string>) => {
      state.messageId = action.payload;
    },
    isEdited: (state, action: PayloadAction<boolean>) => {
      state.isEdited = action.payload
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
  isEdited,
  resetOptions,
} = messageOptionsSlice.actions;

export default messageOptionsSlice.reducer;

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Message } from "@/src/utils/interfaces/TypescriptInterfaces";



interface ConversationPayload {
    id: string;
    user_id: string;
    messages: Message[];
    created_at: string;
    updated_at: string;
}

interface ConversationState {
    conversations: ConversationPayload[];
}

const initialState: ConversationState = {
    conversations: [],
}

const conversationSlice = createSlice({
    name: "conversations",
    initialState,
    reducers: {
        
    }
}) 

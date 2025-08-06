interface MessageContent {
    type: 'text' | 'audio' | 'mixed';
    text?: string;
    audioUrl?: string;
    audioName?: string;
    audioDuration?: number;
}


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
    isTyping?: boolean,
    metadata?: any; 
}

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


export {
    Message,
    MessageContent,
    RealtimeChatProps
}
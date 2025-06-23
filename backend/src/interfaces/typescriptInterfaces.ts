import { Request } from "express";
export interface GeminiMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface GeminiResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: 'assistant';
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface GeminiAIConfig {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
}

export interface ChatRequest {
    message: string;
    conversationHistory?: GeminiMessage[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}


export interface GenerateConversationSummaryRequest extends Request {
    body: {
        conversationId: string;
        userId: number | string;
        customPrompt?: string;
    };
}

export interface ConversationInfo {
    message_count: number;
    last_message_at: string;
    [key: string]: any;
}

export interface AiConversationSummary {
    id?: number;
    conversation_id: string;
    user_id: number;
    title: string;
    summary: string;
    summary_type: string;
    updated_at: string;
    [key: string]: any;
}

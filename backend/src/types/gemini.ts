// types/gemini
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

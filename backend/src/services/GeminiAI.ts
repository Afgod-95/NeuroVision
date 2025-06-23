// services/GeminiAI.ts
import OpenAI from "openai";
import { GeminiAIConfig, GeminiMessage } from "../interfaces/typescriptInterfaces";

class GeminiAIService {
    private openai: OpenAI;
    private model: string;
    private maxTokens: number;
    private temperature: number;
    private topP: number;
    private topK: number;

    constructor(config: GeminiAIConfig) {
        // Initialize OpenAI client with Gemini endpoints
        this.openai = new OpenAI({
            apiKey: config.apiKey,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
        });

        this.model = config.model || "gemini-2.0-flash-exp";
        this.maxTokens = config.maxTokens || 2048;
        this.temperature = config.temperature || 0.7;
        this.topP = config.topP || 0.9;
        this.topK = config.topK || 40;
    }

    /**
     * Send a message to Gemini AI with conversation history
     */
    async sendMessage(
        message: string,
        conversationHistory: GeminiMessage[] = [],
        options?: {
            temperature?: number;
            maxTokens?: number;
            systemPrompt?: string;
        }
    ): Promise<string> {
        try {
            const messages: GeminiMessage[] = [];

            // Add system prompt if provided
            if (options?.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: options.systemPrompt
                });
            }

            // Add conversation history
            messages.push(...conversationHistory);

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages,
                max_tokens: options?.maxTokens || this.maxTokens,
                temperature: options?.temperature || this.temperature,
                top_p: this.topP,
                // Note: top_k is not available in OpenAI-compatible API format
            });

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content || '';
            }

            throw new Error('No content received from Gemini AI');
        } catch (error: any) {
            console.error('Gemini AI API Error:', error);
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Send a message with streaming response
     */
    async sendMessageStream(
        message: string,
        conversationHistory: GeminiMessage[] = [],
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        try {
            const messages: GeminiMessage[] = [
                ...conversationHistory,
                { role: 'user', content: message }
            ];

            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                stream: true,
            });

            let fullResponse = '';

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    if (onChunk) {
                        onChunk(content);
                    }
                }
            }

            return fullResponse;
        } catch (error: any) {
            console.error('Gemini AI Streaming Error:', error);
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Generate text completion without conversation history
     */
    async generateCompletion(
        prompt: string,
        options?: {
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: options?.maxTokens || this.maxTokens,
                temperature: options?.temperature || this.temperature,
            });

            return response.choices[0].message.content || '';
        } catch (error: any) {
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Get available models
     */
    async getModels(): Promise<string[]> {
        try {
            const response = await this.openai.models.list();
            return response.data.map(model => model.id);
        } catch (error: any) {
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Handle Gemini API errors
     */
    private handleGeminiError(error: any): Error {
        if (error.status === 401 || error.response?.status === 401) {
            return new Error('Invalid Gemini AI API key');
        } else if (error.status === 429 || error.response?.status === 429) {
            return new Error('Gemini AI rate limit exceeded. Please try again later.');
        } else if (error.status === 400 || error.response?.status === 400) {
            return new Error('Invalid request to Gemini AI');
        } else if (error.status === 403 || error.response?.status === 403) {
            return new Error('Gemini AI API access forbidden');
        } else if (error.status === 500 || error.response?.status === 500) {
            return new Error('Gemini AI internal server error');
        }

        return new Error(`Gemini AI error: ${error.message || 'Unknown error'}`);
    }
}

export default GeminiAIService;
// services/GeminiAI.ts
import OpenAI from "openai";
import { GeminiAIConfig, GeminiMessage } from "../interfaces/typescriptInterfaces";

// Extended message content type for multimodal support
type MessageContent = string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}>;

interface ExtendedGeminiMessage {
    role: 'system' | 'user' | 'assistant';
    content: MessageContent;
}

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

        this.model = config.model || "gemini-2.5-flash";
        this.maxTokens = config.maxTokens || 1048576;
        this.temperature = config.temperature || 0.7;
        this.topP = config.topP || 0.9;
        this.topK = config.topK || 40;
    }

    /**
     * Send a message to Gemini AI with conversation history and optional files
     */
    async sendMessage(
        message: string,
        conversationHistory: GeminiMessage[] = [],
        options?: {
            temperature?: number;
            maxTokens?: number;
            systemPrompt?: string;
            files?: Array<{
                name: string;
                type: string;
                size: number;
                base64?: string;
                uri?: string;
            }>;
        }
    ): Promise<string> {
        try {
            const messages: ExtendedGeminiMessage[] = [];

            // Add system prompt if provided
            if (options?.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: options.systemPrompt
                });
            }

            // Add conversation history
            messages.push(...conversationHistory);

            // Prepare current message with files if provided
            const currentMessage = this.prepareMessageWithFiles(message, options?.files);
            messages.push(currentMessage);

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages as any,
                max_tokens: options?.maxTokens || this.maxTokens,
                temperature: options?.temperature || this.temperature,
                top_p: this.topP,
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
     * Prepare message content with optional file attachments
     */
    private prepareMessageWithFiles(
        message: string,
        files?: Array<{
            name: string;
            type: string;
            size: number;
            base64?: string;
            uri?: string;
        }>
    ): ExtendedGeminiMessage {
        // If no files, return simple text message
        if (!files || files.length === 0) {
            return {
                role: 'user',
                content: message
            };
        }

        // Prepare multimodal content
        const contentParts: Array<{
            type: 'text' | 'image_url';
            text?: string;
            image_url?: { url: string };
        }> = [];

        // Add text message first
        if (message && message.trim()) {
            contentParts.push({
                type: 'text',
                text: message
            });
        }

        // Add files (images only for now, as Gemini primarily supports images)
        for (const file of files) {
            if (this.isImageFile(file.type)) {
                // Use base64 if available, otherwise use URI
                const imageUrl = file.base64 
                    ? `data:${file.type};base64,${file.base64}`
                    : file.uri || '';

                if (imageUrl) {
                    contentParts.push({
                        type: 'image_url',
                        image_url: {
                            url: imageUrl
                        }
                    });
                }
            } else {
                // For non-image files, add text description
                contentParts.push({
                    type: 'text',
                    text: `[Attached file: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})]`
                });
            }
        }

        return {
            role: 'user',
            content: contentParts
        };
    }

    /**
     * Check if file type is an image
     */
    private isImageFile(mimeType: string): boolean {
        return mimeType.startsWith('image/');
    }

    /**
     * Format file size for display
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    }

    /**
     * Send a message with streaming response
     */
    async sendMessageStream(
        message: string,
        conversationHistory: GeminiMessage[] = [],
        onChunk?: (chunk: string) => void,
        options?: {
            files?: Array<{
                name: string;
                type: string;
                size: number;
                base64?: string;
                uri?: string;
            }>;
        }
    ): Promise<string> {
        try {
            const messages: ExtendedGeminiMessage[] = [
                ...conversationHistory,
                this.prepareMessageWithFiles(message, options?.files)
            ];

            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages as any,
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
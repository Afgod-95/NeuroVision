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

        this.model = config.model || "gemini-2.5-flash"; // Consider gemini-pro-vision for more explicit image handling
        this.maxTokens = config.maxTokens || 1048576; // Max tokens for the response, not input context
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
            const currentMessage = await this.prepareMessageWithFiles(message, options?.files); // Await here
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
     * This method is now async to allow for preprocessing files.
     */
    private async prepareMessageWithFiles( // Make this method async
        message: string,
        files?: Array<{
            name: string;
            type: string;
            size: number;
            base64?: string;
            uri?: string;
        }>
    ): Promise<ExtendedGeminiMessage> {
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

        // Process files
        for (const file of files) {
            if (this.isImageFile(file.type)) {
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
            } else if (this.isDocumentFile(file.type)) {
                // Handle document files: extract text or convert to image
                const documentContent = await this.processDocumentFile(file);
                if (documentContent) {
                    // Assuming processDocumentFile returns text for now
                    contentParts.push({
                        type: 'text',
                        text: `Document: ${file.name}\n${documentContent}`
                    });
                } else {
                    contentParts.push({
                        type: 'text',
                        text: `[Could not process document: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})]`
                    });
                }
            } else if (this.isVideoFile(file.type)) {
                // Handle video files: extract keyframes or transcribe audio
                const videoProcessedContent = await this.processVideoFile(file);
                if (typeof videoProcessedContent === 'string') {
                     // If it's a transcription or summary
                    contentParts.push({
                        type: 'text',
                        text: `Video: ${file.name}\n${videoProcessedContent}`
                    });
                } else if (Array.isArray(videoProcessedContent)) {
                    // If it's an array of image URLs (keyframes)
                    videoProcessedContent.forEach(imageUrl => {
                        if (imageUrl) {
                            contentParts.push({
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl
                                }
                            });
                        }
                    });
                } else {
                    contentParts.push({
                        type: 'text',
                        text: `[Could not process video: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})]`
                    });
                }
            } else {
                // Fallback for other unhandled file types
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
     * Check if file type is a document (e.g., PDF, DOCX, TXT)
     */
    private isDocumentFile(mimeType: string): boolean {
        // You'll need to expand this based on the document types you want to support
        return mimeType.startsWith('application/pdf') ||
               mimeType.startsWith('application/msword') || // .doc
               mimeType.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || // .docx
               mimeType.startsWith('text/plain');
    }

    /**
     * Check if file type is a video
     */
    private isVideoFile(mimeType: string): boolean {
        return mimeType.startsWith('video/');
    }

    /**
     * Placeholder for processing document files.
     * In a real application, you'd integrate libraries like:
     * - `pdf-parse` for PDFs
     * - `mammoth.js` for DOCX
     * - Simple text extraction for TXT
     *
     * Returns text content from the document. For more complex docs,
     * you might return an array of image_urls if you convert pages to images.
     */
    private async processDocumentFile(file: { name: string; type: string; size: number; base64?: string; uri?: string }): Promise<string | null> {
        console.warn(`Processing document file: ${file.name} (${file.type}). This is a placeholder.`);
        // Example: If base64 is available and it's a text file
        if (file.type === 'text/plain' && file.base64) {
            return Buffer.from(file.base64, 'base64').toString('utf8');
        }
        // For PDFs, DOCX, etc., you'd need actual parsing logic here.
        // E.g., using a library to extract text or convert to image.
        // For demonstration, we'll just return a placeholder message.
        return `Content of ${file.name} (actual content extraction requires specific libraries based on file type).`;
    }

    /**
     * Placeholder for processing video files.
     * In a real application, you'd integrate libraries or services for:
     * - Extracting keyframes (e.g., using FFmpeg on a server or a client-side library like `ffmpeg.wasm`)
     * - Transcribing audio (e.g., using a speech-to-text API or client-side libraries)
     *
     * Returns an array of image URLs (keyframes) or a string (transcription/summary).
     */
    private async processVideoFile(file: { name: string; type: string; size: number; base64?: string; uri?: string }): Promise<string | string[] | null> {
        console.warn(`Processing video file: ${file.name} (${file.type}). This is a placeholder.`);
        // For demonstration, we'll assume we can extract a single keyframe as an image URL
        // or provide a simple text summary.

        // Option 1: Provide a text summary/transcription placeholder
        // return `Video ${file.name} summary: (Actual video processing like keyframe extraction or audio transcription would happen here).`;

        // Option 2: Simulate keyframe extraction (you'd need actual logic for this)
        // Let's assume you have a way to generate a thumbnail/keyframe URL.
        // For base64 videos, this is complex on the client-side. For `uri` it's easier
        // if the URI points to a publicly accessible video where you can generate thumbnails.
        if (file.uri) {
            // This is a hypothetical URL to a generated thumbnail.
            // In a real scenario, you'd likely have a backend service
            // that takes the video URI and returns keyframe images.
            console.log("Generating a placeholder image for video...");
            return `https://example.com/generated-keyframe-for-${encodeURIComponent(file.name)}.png`;
        }

        // If no URI, just return a text placeholder
        return `Video ${file.name} (actual video processing like keyframe extraction or audio transcription would happen here).`;
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
                await this.prepareMessageWithFiles(message, options?.files) // Await here
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
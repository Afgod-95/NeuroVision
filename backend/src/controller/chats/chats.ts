// controllers/geminiController.ts
import { Request, Response } from "express";
import GeminiAIService from "../../services/GeminiAI";
import { ChatRequest, GeminiMessage } from "../../types/gemini";
import supabase from "../../lib/supabase";
import { v4 as uuidv4 } from 'uuid';

// Initialize Gemini service with enhanced system prompt for coding assistance
const geminiService = new GeminiAIService({
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.0-flash-exp",
    maxTokens: 8192, 
    temperature: 0.7
});

// Enhanced system prompt for better coding, debugging, and text generation assistance
const DEFAULT_SYSTEM_PROMPT = `You are an advanced AI assistant specialized in:
1. Code Writing: Generate clean, efficient, and well-documented code in various programming languages
2. Debugging: Analyze code issues, identify bugs, and provide solutions with explanations
3. Text Generation: Create high-quality content for various purposes
4. Technical Explanation: Explain complex concepts clearly and provide step-by-step guidance

When helping with code:
- Write production-ready code with proper error handling
- Include helpful comments and documentation
- Follow best practices and modern conventions
- Provide multiple solutions when applicable
- Explain the reasoning behind your approach

When debugging:
- Analyze the code thoroughly
- Identify potential issues and root causes
- Provide working fixes with explanations
- Suggest improvements and optimizations

Always be helpful, accurate, and provide actionable solutions.`;

/**
 * Validate UUID format with improved regex
 */
export const isValidUUID = (uuid: string): boolean => {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Store message in Supabase with enhanced error handling and retry logic
 */
const storeMessage = async (
    conversationId: string,
    userId: number,
    sender: 'user' | 'assistant' | 'system',
    content: string,
    retries: number = 3
): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Validate UUID format
            if (!isValidUUID(conversationId)) {
                throw new Error(`Invalid conversation_id format: ${conversationId}. Must be a valid UUID.`);
            }

            // Validate required fields
            if (!content || content.trim() === '') {
                throw new Error('Message content cannot be empty');
            }

            if (!userId || userId <= 0) {
                throw new Error('Invalid user_id');
            }

            // Truncate content if too long (adjust based on your DB schema)
            const truncatedContent = content.length > 50000 ? content.substring(0, 50000) + '...' : content;

            console.log(`Storing message (attempt ${attempt}):`, {
                conversation_id: conversationId,
                user_id: userId,
                sender,
                content_length: truncatedContent.length
            });

            
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    sender,
                    content: truncatedContent.trim()
                })
                .select();

            if (error) {
                console.error('Supabase error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    attempt
                });
                
                if (attempt === retries) {
                    throw new Error(`Database error after ${retries} attempts: ${error.message}`);
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }

            console.log('Message stored successfully:', data?.[0]?.id || 'No ID returned');
            return;
        } catch (error) {
            if (attempt === retries) {
                console.error('Error in storeMessage after all retries:', error);
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
};

/**
 * Retrieve conversation history from Supabase with pagination
 */
const getConversationHistory = async (
    conversationId: string,
    userId: number,
    limit: number = 50,
    offset: number = 0
): Promise<GeminiMessage[]> => {
    try {
        // Validate UUID format
        if (!isValidUUID(conversationId)) {
            console.warn(`Invalid conversation_id format: ${conversationId}`);
            return [];
        }

        const { data, error } = await supabase
            .from('messages')
            .select('id, sender, content, created_at')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching conversation history:', error);
            return [];
        }

        return data?.map(msg => ({
            role: (msg.sender === "user" || msg.sender === "assistant" || msg.sender === "system"
                ? msg.sender
                : "user") as "user" | "assistant" | "system",
            content: msg.content
        })) || [];
    } catch (error) {
        console.error('Database error:', error);
        return [];
    }
};

/**
 * Generate or validate conversation ID
 */
const getOrCreateConversationId = (conversationId?: string): string => {
    if (conversationId && isValidUUID(conversationId)) {
        return conversationId;
    }
    
    // Generate new UUID if not provided or invalid
    const newId = uuidv4();
    console.log('Generated new conversation ID:', newId);
    return newId;
};

/**
 *chat message handler with better error handling and response formatting
 */
export const sendChatMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            message, 
            conversationHistory, 
            systemPrompt, 
            temperature, 
            maxTokens,
            conversationId: rawConversationId,
            userId,
            useDatabase = false
        }: ChatRequest & {
            conversationId?: string;
            userId?: number;
            useDatabase?: boolean;
        } = req.body;

        console.log('Request received:', {
            message: message ? `${message.substring(0, 100)}...` : 'No message',
            conversationId: rawConversationId,
            userId,
            useDatabase,
            historyLength: conversationHistory?.length || 0
        });

        // Enhanced validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Message is required and must be a non-empty string'
            });
            return;
        }

        if (message.length > 50000) {
            res.status(400).json({
                success: false,
                error: 'Message is too long. Maximum length is 50,000 characters.'
            });
            return;
        }

        if (useDatabase && !userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required when useDatabase is true'
            });
            return;
        }

        // Generate or validate conversation ID
        const conversationId = useDatabase ? getOrCreateConversationId(rawConversationId) : rawConversationId;

        // Get conversation history from database if using database mode
        let history = conversationHistory || [];
        if (useDatabase && conversationId && userId) {
            history = await getConversationHistory(conversationId, userId);
        }

        // Limit history length to prevent token overflow
        const maxHistoryLength = 20;
        if (history.length > maxHistoryLength) {
            history = history.slice(-maxHistoryLength);
        }

        // Enhanced system prompt for better assistance
        const enhancedSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        // Store user message if using database (async, don't block response)
        if (useDatabase && conversationId && userId) {
            storeMessage(conversationId, userId, 'user', message).catch(error => {
                console.error('Failed to store user message:', error);
            });
        }

        // Send message to Gemini with enhanced configuration
        const response = await geminiService.sendMessage(
            message,
            history,
            {
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: maxTokens || 4096
            }
        );

        // Store assistant response if using database (async, don't block response)
        if (useDatabase && conversationId && userId && response) {
            storeMessage(conversationId, userId, 'assistant', response).catch(error => {
                console.error('Failed to store assistant message:', error);
            });
        }

        // Prepare updated conversation history for response (not stored in DB)
        const updatedHistory = [
            ...history,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: response }
        ];

        // Enhanced response format
        res.json({
            success: true,
            response,
            conversationHistory: updatedHistory,
            conversationId,
            metadata: {
                messageStored: useDatabase,
                historyLength: updatedHistory.length,
                responseLength: response.length,
                model: "gemini-2.0-flash-exp",
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Chat message error:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to send message to Gemini AI';
        let statusCode = 500;

        if (error.message?.includes('Invalid conversation_id')) {
            errorMessage = 'Invalid conversation ID format. Must be a valid UUID.';
            statusCode = 400;
        } else if (error.message?.includes('Foreign key constraint')) {
            errorMessage = 'Invalid user ID. User does not exist.';
            statusCode = 400;
        } else if (error.message?.includes('database') || error.message?.includes('store')) {
            errorMessage = `Database error: ${error.message}`;
        } else if (error.message?.includes('Gemini') || error.message?.includes('API')) {
            errorMessage = 'Failed to get response from Gemini AI';
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
            errorMessage = 'API quota exceeded. Please try again later.';
            statusCode = 429;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Enhanced streaming message with better error handling
 */
export const sendStreamingMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            message, 
            conversationHistory,
            conversationId: rawConversationId,
            userId,
            useDatabase = false,
            systemPrompt,
            temperature,
            maxTokens
        }: ChatRequest & {
            conversationId?: string;
            userId?: number;
            useDatabase?: boolean;
        } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Message is required and must be a non-empty string'
            });
            return;
        }

        if (useDatabase && !userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required when useDatabase is true'
            });
            return;
        }

        // Generate or validate conversation ID
        const conversationId = useDatabase ? getOrCreateConversationId(rawConversationId) : rawConversationId;

        // Get conversation history from database if using database mode
        let history = conversationHistory || [];
        if (useDatabase && conversationId && userId) {
            history = await getConversationHistory(conversationId, userId);
        }

        // Store user message if using database (async)
        if (useDatabase && conversationId && userId) {
            storeMessage(conversationId, userId, 'user', message).catch(error => {
                console.error('Failed to store user message:', error);
            });
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        let fullResponse = '';

        await geminiService.sendMessageStream(
            message,
            history,
            (chunk: string) => {
                res.write(chunk);
                fullResponse += chunk;
            },
        );

        // Store assistant response if using database (async)
        if (useDatabase && conversationId && userId && fullResponse) {
            storeMessage(conversationId, userId, 'assistant', fullResponse).catch(error => {
                console.error('Failed to store assistant message:', error);
            });
        }

        res.end();
    } catch (error: any) {
        console.error('Streaming message error:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to stream message from Gemini AI'
            });
        } else {
            res.write(`\n\nError: ${error.message}`);
            res.end();
        }
    }
};

/**
 * Generate a text completion with enhanced prompting
 */
export const generateCompletion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            prompt, 
            temperature, 
            maxTokens, 
            type = 'general',
            conversationId: rawConversationId,
            userId,
            useDatabase = false
        } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Prompt is required and must be a non-empty string'
            });
            return;
        }

        if (useDatabase && !userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required when useDatabase is true'
            });
            return;
        }

        // Generate or validate conversation ID
        const conversationId = useDatabase ? getOrCreateConversationId(rawConversationId) : rawConversationId;

        // Enhanced prompts based on completion type
        const enhancedPrompts = {
            code: `${DEFAULT_SYSTEM_PROMPT}\n\nCode Generation Request: ${prompt}`,
            debug: `${DEFAULT_SYSTEM_PROMPT}\n\nDebugging Request: Analyze the following code and provide solutions: ${prompt}`,
            text: `You are a professional writer and content creator. Generate high-quality, engaging content based on: ${prompt}`,
            general: prompt
        };

        const enhancedPrompt = enhancedPrompts[type as keyof typeof enhancedPrompts] || prompt;

        // Store prompt if using database (async)
        if (useDatabase && conversationId && userId) {
            storeMessage(conversationId, userId, 'user', prompt).catch(error => {
                console.error('Failed to store prompt:', error);
            });
        }

        const response = await geminiService.generateCompletion(enhancedPrompt, {
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 4096
        });

        // Store completion if using database (async)
        if (useDatabase && conversationId && userId && response) {
            storeMessage(conversationId, userId, 'assistant', response).catch(error => {
                console.error('Failed to store completion:', error);
            });
        }

        res.json({
            success: true,
            completion: response,
            type,
            conversationId,
            metadata: {
                messageStored: useDatabase,
                responseLength: response.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Completion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate completion'
        });
    }
};

/**
 * Get conversation history endpoint with pagination
 */
export const getConversation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, userId, limit = 50, offset = 0 } = req.query;

        if (!conversationId || !userId) {
            res.status(400).json({
                success: false,
                error: 'conversationId and userId are required'
            });
            return;
        }

        if (!isValidUUID(conversationId as string)) {
            res.status(400).json({
                success: false,
                error: 'Invalid conversationId format. Must be a valid UUID.'
            });
            return;
        }

        const history = await getConversationHistory(
            conversationId as string, 
            parseInt(userId as string), 
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            success: true,
            conversationId,
            history,
            metadata: {
                messageCount: history.length,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Get conversation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch conversation history'
        });
    }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, limit = 20, offset = 0 } = req.query;

        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required'
            });
            return;
        }

        const { data, error } = await supabase
            .from('conversation_summaries')
            .select('*')
            .eq('user_id', parseInt(userId as string))
            .order('last_message_at', { ascending: false })
            .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            conversations: data || [],
            metadata: {
                count: data?.length || 0,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Get user conversations error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch user conversations'
        });
    }
};

/**
 * Delete conversation endpoint
 */
export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, userId } = req.body;

        if (!conversationId || !userId) {
            res.status(400).json({
                success: false,
                error: 'conversationId and userId are required'
            });
            return;
        }

        if (!isValidUUID(conversationId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid conversationId format. Must be a valid UUID.'
            });
            return;
        }

        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

        if (error) {
            throw new Error(`Failed to delete conversation: ${error.message}`);
        }

        res.json({
            success: true,
            message: 'Conversation deleted successfully',
            conversationId,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete conversation'
        });
    }
};

/**
 * Get available Gemini models
 */
export const getModels = async (req: Request, res: Response): Promise<void> => {
    try {
        const models = await geminiService.getModels();
        res.json({
            success: true,
            models,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Get models error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch models'
        });
    }
};

/**
 * Health check endpoint
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
        // Test Gemini AI service
        const testResponse = await geminiService.sendMessage("Hello, please respond with 'AI service is working'", []);
        
        // Test database connection
        const { error: dbError } = await supabase
            .from('messages')
            .select('id')
            .limit(1);

        const dbStatus = dbError ? 'Database connection failed' : 'Database connection successful';

        res.json({
            success: true,
            status: 'Services operational',
            services: {
                geminiAI: {
                    status: 'operational',
                    testResponse: testResponse.substring(0, 100) + '...',
                    model: "gemini-2.0-flash-exp"
                },
                database: {
                    status: dbError ? 'error' : 'operational',
                    message: dbStatus,
                    error: dbError?.message
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            status: 'Service error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Test database connection endpoint
 */
export const testDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
        const testConversationId = uuidv4();
        const testUserId = 12; // Use a valid user ID that exists in your users table
        const testMessage = "Test message for database connectivity";

        // Try to insert a test message
        await storeMessage(testConversationId, testUserId, 'user', testMessage);
        
        // Try to retrieve it
        const history = await getConversationHistory(testConversationId, testUserId);
        
        // Clean up test data
        const { error: cleanupError } = await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', testConversationId);

        res.json({
            success: true,
            message: 'Database test passed',
            testResults: {
                insertSuccess: true,
                retrieveSuccess: history.length > 0,
                cleanupSuccess: !cleanupError,
                messagesFound: history.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database test failed',
            timestamp: new Date().toISOString()
        });
    }
};
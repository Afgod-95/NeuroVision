
import { Request, Response } from "express";
import { ChatRequest, GeminiMessage } from "../../interfaces/typescriptInterfaces";
import supabase from "../../lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from "../../middlewares/isValidUUID";
import { generateConversationSummary, shouldUpdateSummary } from "../../helpers/chatSummary/AISummary";
import geminiService from "../../services/GeminiInitiation";
import { DEFAULT_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from "../../utils/AIPrompts";



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
export const getConversationHistory = async (
    userId: number,
    limit: number = 50,
    offset: number = 0
): Promise<GeminiMessage[]> => {
    try {

        if (!userId) {
            throw new Error('User ID is required');
        }

        const { data, error } = await supabase
            .from('messages')
            .select('*')
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
 * Chat message handler with better error handling and response formatting
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
        console.log('Using conversation ID:', conversationId);

        // Get conversation history from database if using database mode
        let history = conversationHistory || [];
        if (useDatabase && conversationId && userId) {
            try {
                history = await getConversationHistory(userId);
                console.log(`Retrieved ${history.length} messages from database`);
            } catch (error) {
                console.error('Error getting conversation history:', error);
                // Continue with empty history if database fetch fails
                history = [];
            }
        }

        // Limit history length to prevent token overflow
        const maxHistoryLength = 20;
        if (history.length > maxHistoryLength) {
            history = history.slice(-maxHistoryLength);
        }

        // Enhanced system prompt for better assistance
        const enhancedSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        // Store user message if using database - WAIT for completion
        let userMessageStored = false;
        if (useDatabase && conversationId && userId) {
            console.log('Storing user message...');
            try {
                await storeMessage(conversationId, userId, 'user', message);
                userMessageStored = true;
                console.log('✅ User message stored successfully');
            } catch (error) {
                console.error('❌ Failed to store user message:', error);
                // Continue without blocking the response
            }
        }

        // Send message to Gemini with enhanced configuration
        console.log('Sending message to Gemini...');
        const response = await geminiService.sendMessage(
            message,
            history,
            {
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: maxTokens || 4096
            }
        );

        console.log(`Received response from Gemini (${response.length} characters)`);

        // Store assistant response if using database - WAIT for completion
        let assistantMessageStored = false;
        if (useDatabase && conversationId && userId && response) {
            console.log('Storing assistant message...');
            try {
                await storeMessage(conversationId, userId, 'assistant', response);
                assistantMessageStored = true;
                console.log('✅ Assistant message stored successfully');
            } catch (error) {
                console.error('❌ Failed to store assistant message:', error);
                // Continue without blocking the response
            }
        }

        // Prepare updated conversation history for response 
        const updatedHistory = [
            ...history,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: response }
        ];

        // Handle AI conversation summary ONLY if both messages were stored successfully
        if (useDatabase && conversationId && userId && userMessageStored && assistantMessageStored) {
            console.log('Starting summary generation process...');

            // Get actual message count from database instead of using in-memory history
            try {
                const { count: actualMessageCount, error: countError } = await supabase
                    .from('messages')
                    .select('content', { count: 'exact', head: true }) //selecting content to get actual message count
                    .eq('conversation_id', conversationId)
                    .eq('user_id', userId);

                if (countError) {
                    console.error('Error getting message count:', countError);
                } else {
                    console.log(`Actual message count in DB: ${actualMessageCount}`);

                    // Use actualMessageCount (which is the count) instead of messageCount?.length
                    const shouldGenerate = await shouldUpdateSummary(
                        conversationId,
                        parseInt(userId.toString()),
                        actualMessageCount || 0
                    );
                    console.log(`Should generate summary: ${shouldGenerate}`);

                    if (shouldGenerate) {
                        console.log('Generating conversation summary...');

                        // Generate summary asynchronously with proper delay
                        setTimeout(async () => {
                            try {
                                console.log('🚀 Starting delayed summary generation...');

                                const result = await generateConversationSummary(
                                    conversationId,
                                    userId,
                                    SUMMARY_SYSTEM_PROMPT
                                );

                                if (result?.success) {
                                    console.log("✅ Summary generated successfully:", {
                                        title: result.title,
                                        summaryLength: result.summary?.length || 0
                                    });
                                } else {
                                    console.warn("⚠️ Summary generation completed but returned no success confirmation");
                                }
                            } catch (err: any) {
                                console.error("❌ Summary generation failed:");
                                console.error("Error message:", err.message);
                                console.error("Error stack:", err.stack);
                                console.error("Summary params used:", {
                                    conversationId,
                                    userId,
                                    actualMessageCount
                                });
                            }
                        }, 2000); 
                    } else {
                        console.log('Skipping summary generation (conditions not met)');
                    }
                }
            } catch (error) {
                console.error('Error in summary generation process:', error);
            }
        } else {
            if (useDatabase) {
                console.log('Skipping summary generation due to message storage issues:', {
                    userMessageStored,
                    assistantMessageStored,
                    conversationId: !!conversationId,
                    userId: !!userId
                });
            }
        }

        // Enhanced response format
        res.json({
            success: true,
            response,
            conversationHistory: updatedHistory,
            conversationId,
            metadata: {
                messageStored: useDatabase && userMessageStored && assistantMessageStored,
                historyLength: updatedHistory.length,
                responseLength: response.length,
                model: "gemini-2.5-flash",
                timestamp: new Date().toISOString(),
                summaryProcessed: useDatabase
            }
        });

    } catch (error: any) {
        console.error('Chat message error:', error);
        console.error('Error stack:', error.stack);

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
 * Alternative function to force generate a summary for testing
 */
export const forceGenerateSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, userId } = req.body;

        if (!conversationId || !userId) {
            res.status(400).json({
                success: false,
                error: 'conversationId and userId are required'
            });
            return;
        }

        console.log(`🔧 Force generating summary for conversation ${conversationId}, user ${userId}`);

        // Get current message count
        const { data: messages, error } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

        if (error) {
            throw error;
        }

        console.log(`Found ${messages?.length || 0} messages in conversation`);

        await generateConversationSummary(conversationId, userId, undefined, req, res);

    } catch (error: any) {
        console.error('Force generate summary error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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

            // Handle AI conversation summary for completion (async)
            const updatedHistory = [
                { role: 'user' as const, content: prompt },
                { role: 'assistant' as const, content: response }
            ];

            generateConversationSummary(conversationId, userId, updatedHistory.toString()).catch(error => {
                console.error('Failed to handle conversation summary:', error);
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
        const { userId, limit = 50, offset = 0 } = req.query;

        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'conversationId and userId are required'
            });
            return;
        }

        const history = await getConversationHistory(
            parseInt(userId as string),
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            success: true,
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
 * Get conversation messages by conversation ID
 */
export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, userId } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

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
                error: 'Invalid conversationId format'
            });
            return;
        }

        // First verify the conversation belongs to the user
        const { data: conversationExists } = await supabase
            .from('ai_conversation_summaries')
            .select('conversation_id')
            .eq('conversation_id', conversationId)
            .eq('user_id', parseInt(userId as string))
            .single();

        if (!conversationExists) {
            res.status(404).json({
                success: false,
                error: 'Conversation not found or access denied'
            });
            return;
        }

        // Get messages for this conversation
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', parseInt(userId as string))
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            conversationId,
            messages: messages || [],
            messageCount: messages?.length || 0,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Get conversation messages error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch conversation messages'
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
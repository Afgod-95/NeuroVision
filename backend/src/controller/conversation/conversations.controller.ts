
import { Request, Response } from "express";
import { ChatRequest, GeminiMessage } from "../../interfaces/typescriptInterfaces";
import supabase from "../../lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from "../../helpers/isValidUUID";
import { generateConversationSummary, shouldUpdateSummary } from "../../helpers/chatSummary/AISummary";
import geminiService from "../../services/GeminiInitiation";
import { DEFAULT_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from "../../utils/AIPrompts";
import { storeMessage } from "../../helpers/storeMessage/store_message";
import { getOrCreateConversationId } from "../../helpers/conversations/get_or_generate_conversation_id";







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
            useDatabase = false
        } = req.body;

        const authUserId = req?.user?.id;
        const userId = parseInt(authUserId as string);
        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required'
            });
            return;
        }

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
        const { limit = 50, offset = 0 } = req.query;
        const authUserId = req?.user?.id;
        const userId = parseInt(authUserId as string);
        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required'
            });
            return;
        }

        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'conversationId and userId are required'
            });
            return;
        }

        const history = await getConversationHistory(
            userId,
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
 * Get conversation summary messages and messages by conversation ID
 */
export const getSummaryMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, page = 1, limit = 50 } = req.query;
        const authUserId = req?.user?.id;
        const userId = parseInt(authUserId as string);

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
            .eq('user_id', userId)
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
            .eq('user_id', userId)
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
 * Delete conversation summary and related messages
 */
export const deleteConversationSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.query;
    const authUserId = req?.user?.id;
    const userId = parseInt(authUserId as string);

    if (!conversationId || !userId) {
      res.status(400).json({
        success: false,
        error: 'conversationId (query) and userId are required',
      });
      return;
    }

    const conversationIdStr = conversationId.toString();

    if (!isValidUUID(conversationIdStr)) {
      res.status(400).json({
        success: false,
        error: 'Invalid conversationId format. Must be a valid UUID.',
      });
      return;
    }

    // Step 1: Delete related messages
    const { error: messageError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationIdStr)
      .eq('user_id', userId);

    if (messageError) {
      throw new Error(`Failed to delete related messages: ${messageError.message}`);
    }

    // Step 2: Delete the conversation summary
    const { error: summaryError } = await supabase
      .from('ai_conversation_summaries')
      .delete()
      .eq('conversation_id', conversationIdStr)
      .eq('user_id', userId);

    if (summaryError) {
      throw new Error(`Failed to delete conversation summary: ${summaryError.message}`);
    }

    res.json({
      success: true,
      message: 'Conversation and related messages deleted successfully',
      conversationId: conversationIdStr,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversation and messages',
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
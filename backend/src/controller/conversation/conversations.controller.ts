
import { Request, Response } from "express";
import { ChatRequest, GeminiMessage } from "../../interfaces/typescriptInterfaces";
import supabase from "../../lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from "../../helpers/isValidUUID";
import { generateConversationSummary, shouldUpdateSummary } from "../../helpers/chatSummary/AISummary";
import geminiService from "../../services/GeminiInitiation";
import { DEFAULT_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from "../../utils/AIPrompts";
import { storeMessage } from "../../helpers/conversations/storeMessage/store_message";
import { getOrCreateConversationId } from "../../helpers/conversations/get_or_generate_conversation_id";
import { getConversationHistory } from "../../helpers/conversations/get_conversation_history";

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
 * Delete conversation summary and related messages
 */



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
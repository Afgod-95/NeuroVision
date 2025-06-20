// controllers/geminiController.ts
import { Request, Response } from "express";
import GeminiAIService from "../../services/GeminiAI";
import supabase from "../../lib/supabase";
import { getConversationHistory } from "./chats";
import { isValidUUID } from "../../middlewares/isValidUUID";

// Initialize Gemini service with enhanced system prompt for coding assistance
const geminiService = new GeminiAIService({
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.0-flash-exp",
    maxTokens: 8192,
    temperature: 0.7
});


/**
 * Auto-generate summary - Updated for Supabase view
 */
const autoGenerateSummary = async (conversationId: string, userId: number): Promise<void> => {
    try {
        // Get conversation info from the view
        const { data: conversationInfo } = await supabase
            .from('conversation_summaries')
            .select('message_count, last_message_at')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (!conversationInfo) {
            console.log(`No conversation found for auto-summary: ${conversationId}`);
            return;
        }

        // Check if we already have an AI summary
        const { data: existingSummary } = await supabase
            .from('ai_conversation_summaries')
            .select('id, updated_at')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        // Auto-generate summary if:
        // 1. No existing summary and conversation has 8+ messages, OR
        // 2. Conversation has grown significantly since last summary
        const shouldGenerateSummary =
            (!existingSummary && conversationInfo.message_count >= 8) ||
            (existingSummary && conversationInfo.message_count >= 15);

        if (shouldGenerateSummary) {
            console.log(`Auto-generating summary for conversation ${conversationId} with ${conversationInfo.message_count} messages`);

            const history = await getConversationHistory(userId, 100, 0);

            if (history.length === 0) return;

            const conversationText = history
                .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
                .join('\n\n');

            const summaryPrompt = `Provide a concise summary of this conversation highlighting the main topics, questions asked, and solutions provided:

${conversationText}

SUMMARY:`;

            const summary = await geminiService.generateCompletion(summaryPrompt, {
                temperature: 0.3,
                maxTokens: 512
            });

            // Generate title from first user message or summary
            const firstUserMessage = history.find(msg => msg.role === 'user')?.content || '';
            const titlePrompt = `Generate a brief title (max 6 words) for a conversation about: "${firstUserMessage.substring(0, 150)}"

Title:`;

            const title = await geminiService.generateCompletion(titlePrompt, {
                temperature: 0.3,
                maxTokens: 30
            });

            const cleanTitle = title.trim().replace(/^["']|["']$/g, '');

            // Store the auto-generated summary
            await supabase
                .from('ai_conversation_summaries')
                .upsert({
                    conversation_id: conversationId,
                    user_id: userId,
                    title: cleanTitle,
                    summary: summary,
                    summary_type: 'auto',
                    updated_at: new Date().toISOString()
                });

            console.log(`Auto-summary generated for conversation ${conversationId}`);
        }
    } catch (error) {
        console.error('Auto-generate summary error:', error);
        // Don't throw error to avoid breaking the main chat flow
    }
};

/**
 * Get conversation summary - Updated for enhanced view
 */
export const getConversationSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, userId } = req.query;

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

        // Get from the enhanced view that combines both tables
        const { data, error } = await supabase
            .from('enhanced_conversation_summaries')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', parseInt(userId as string))
            .single();

        if (error && error.code !== 'PGRST116') { 
            throw error;
        }

        if (!data) {
            res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
            return;
        }

        res.json({
            success: true,
            conversationData: data,
            hasSummary: !!data.summary,
            needsSummary: data.needs_summary,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Get summary error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch conversation summary'
        });
    }
};

/**
 * Get all conversations with summaries - Updated for your view
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

        // Use the enhanced view that combines both your existing view and AI summaries
        const { data, error } = await supabase
            .from('enhanced_conversation_summaries')
            .select('*')
            .eq('user_id', parseInt(userId as string))
            .order('last_message_at', { ascending: false })
            .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

        if (error) {
            throw error;
        }

        // Separate conversations with and without summaries
        const withSummaries = data?.filter(conv => conv.summary) || [];
        const withoutSummaries = data?.filter(conv => !conv.summary) || [];

        res.json({
            success: true,
            conversations: data || [],
            stats: {
                total: data?.length || 0,
                withSummaries: withSummaries.length,
                withoutSummaries: withoutSummaries.length,
                needingSummaries: data?.filter(conv => conv.needs_summary).length || 0
            },
            metadata: {
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
 * Bulk generate summaries for conversations that need them
 */
export const bulkGenerateSummaries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, limit = 10 } = req.body;

        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required'
            });
            return;
        }

        // Get conversations that need summaries
        const { data: conversationsNeedingSummaries, error } = await supabase
            .from('enhanced_conversation_summaries')
            .select('conversation_id, message_count')
            .eq('user_id', userId)
            .eq('needs_summary', true)
            .gte('message_count', 5) // Only conversations with at least 5 messages
            .order('last_message_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw error;
        }

        if (!conversationsNeedingSummaries || conversationsNeedingSummaries.length === 0) {
            res.json({
                success: true,
                message: 'No conversations need summaries',
                processed: 0
            });
            return;
        }

        const results = [];

        // Process each conversation
        for (const conv of conversationsNeedingSummaries) {
            try {
                await autoGenerateSummary(conv.conversation_id, userId);
                results.push({
                    conversationId: conv.conversation_id,
                    success: true,
                    messageCount: conv.message_count
                });
            } catch (error: any) {
                results.push({
                    conversationId: conv.conversation_id,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Processed ${results.length} conversations`,
            results,
            processed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Bulk generate summaries error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to bulk generate summaries'
        });
    }
};
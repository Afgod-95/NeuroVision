// controllers/geminiController.ts
import { Request, Response } from "express";
import GeminiAIService from "../../services/GeminiAI";
import supabase from "../../lib/supabase";
import { isValidUUID } from "../../middlewares/isValidUUID";
import geminiService from "../../services/GeminiInitiation";

interface GenerateConversationSummaryRequest extends Request {
    body: {
        conversationId: string;
        userId: number | string;
        customPrompt?: string;
    };
}

interface ConversationInfo {
    message_count: number;
    last_message_at: string;
    [key: string]: any;
}

interface AiConversationSummary {
    id?: number;
    conversation_id: string;
    user_id: number;
    title: string;
    summary: string;
    summary_type: string;
    updated_at: string;
    [key: string]: any;
}

/**
 * Enhanced conversation summary generation with better conversation handling
 */
export const generateConversationSummary = async (
    conversationId: string,
    userId: number | string,
    customPrompt: string | undefined,
    req?: GenerateConversationSummaryRequest,
    res?: Response
): Promise<void> => {
    try {
        console.log(`Starting summary generation for conversation: ${conversationId}, user: ${userId}`);

        // Validate required parameters
        if (!conversationId || !userId) {
            const errorMsg = 'conversationId and userId are required';
            console.error(errorMsg);
            if (res) {
                res.status(400).json({
                    success: false,
                    error: errorMsg
                });
            }
            return;
        }

        if (!isValidUUID(conversationId)) {
            const errorMsg = 'Invalid conversationId format. Must be a valid UUID.';
            console.error(errorMsg);
            if (res) {
                res.status(400).json({
                    success: false,
                    error: errorMsg
                });
            }
            return;
        }

        // Validate API key
        if (!process.env.GEMINI_API_KEY) {
            const errorMsg = 'Gemini API key is not configured';
            console.error(errorMsg);
            if (res) {
                res.status(500).json({
                    success: false,
                    error: 'AI service is not properly configured'
                });
            }
            return;
        }

        console.log(`Fetching messages for conversation ${conversationId}...`);

        // Get messages for this specific conversation
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', parseInt(userId as string))
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Database error fetching messages:', messagesError);
            throw messagesError;
        }

        console.log(`Found ${messages?.length || 0} messages`);

        if (!messages || messages.length === 0) {
            const errorMsg = 'No messages found in conversation';
            console.error(errorMsg);
            if (res) {
                res.status(404).json({
                    success: false,
                    error: errorMsg
                });
            }
            return;
        }

        // Create conversation text for summarization
        const conversationText = messages
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');

        console.log(`Conversation text length: ${conversationText.length} characters`);

        // Enhanced summary prompt
        const summaryPrompt: string = customPrompt || `Please analyze the following conversation and provide a comprehensive summary that includes:

1. Main Topics Discussed: Key subjects and themes covered
2. Key Questions Asked: Important questions raised by the user
3. Solutions Provided: Main solutions, advice, or answers given
4. Technical Details: Any code, technical concepts, or specific implementations mentioned
5. Action Items: Any next steps or recommendations provided
6. Conversation Outcome: Overall result or conclusion reached

Please keep the summary concise but informative, focusing on the most important aspects of the conversation.

CONVERSATION:
${conversationText}

SUMMARY:`;

        console.log(`Generating summary for conversation ${conversationId} with ${messages.length} messages`);

        try {
            // Generate summary using Gemini
            const summary: string = await geminiService.generateCompletion(summaryPrompt, {
                temperature: 0.3,
                maxTokens: 1024
            });

            console.log(`Generated summary length: ${summary.length} characters`);

            if (!summary || summary.trim().length === 0) {
                throw new Error('AI service returned empty summary');
            }

            // Generate a title for the conversation
            console.log('Generating conversation title...');
            const titlePrompt: string = `Based on this conversation summary, generate a brief, descriptive title (max 8 words) that captures the main topic:

${summary}

Title:`;

            const title: string = await geminiService.generateCompletion(titlePrompt, {
                temperature: 0.3,
                maxTokens: 50
            });

            const cleanTitle: string = title.trim().replace(/^["']|["']$/g, '');
            console.log(`Generated title: ${cleanTitle}`);

            if (!cleanTitle || cleanTitle.length === 0) {
                throw new Error('AI service returned empty title');
            }

            // Store the AI-generated summary
            console.log('Storing summary in database...');
            const { data, error }: { data: AiConversationSummary[] | null, error: any } = await supabase
                .from('ai_conversation_summaries')
                .upsert({
                    conversation_id: conversationId,
                    user_id: parseInt(userId as string),
                    title: cleanTitle,
                    summary: summary,
                    summary_type: 'manual',
                    message_count: messages.length,
                    updated_at: new Date().toISOString()
                })
                .select();

            if (error) {
                console.error('Error storing conversation summary:', error);
                throw new Error(`Failed to store summary: ${error.message}`);
            }

            console.log('Summary generated and stored successfully');

            if (res) {
                res.json({
                    success: true,
                    conversationId,
                    title: cleanTitle,
                    summary,
                    messageCount: messages.length,
                    summaryData: data?.[0],
                    timestamp: new Date().toISOString()
                });
            }

        } catch (aiError: any) {
            console.error('AI service error:', aiError);
            throw new Error(`AI service failed: ${aiError.message}`);
        }

    } catch (error: any) {
        console.error('Generate summary error:', error);
        if (res) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate conversation summary',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};


/**
 * Check if summary should be updated based on conversation activity
 */
export const shouldUpdateSummary = async (
    conversationId: string,
    userId: number,
    messageCount: number
): Promise<boolean> => {
    try {
        console.log(`Checking if summary should be updated for conversation ${conversationId}, messageCount: ${messageCount}`);

        // Get existing summary info
        const { data: existingSummary } = await supabase
            .from('ai_conversation_summaries')
            .select('id, updated_at, message_count')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .maybeSingle();

        // Update summary if:
        // 1. No existing summary and conversation has 8+ messages
        // 2. Existing summary but conversation has grown significantly (every 10 messages after initial summary)
        if (!existingSummary) {
            console.log(`No existing summary found. Should update: ${messageCount >= 8}`);
            return messageCount >= 8;
        } else {
            const shouldUpdate = messageCount % 10 === 0 && messageCount >= 15;
            console.log(`Existing summary found with ${existingSummary.message_count} messages. Current: ${messageCount}. Should update: ${shouldUpdate}`);
            return shouldUpdate;
        }
    } catch (error) {
        console.log('Error checking summary update status:', error);
        return false;
    }
};
// controllers/geminiController.ts
import { Request, Response } from "express";
import GeminiAIService from "../../services/GeminiAI";
import supabase from "../../lib/supabase";
import { getConversationHistory } from "../../controller/chats/chats";
import { isValidUUID } from "../../middlewares/isValidUUID";

// Initialize Gemini service with enhanced system prompt for coding assistance
const geminiService = new GeminiAIService({
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.0-flash-exp",
    maxTokens: 8192,
    temperature: 0.7
});


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
 * Generate conversation summary using Gemini AI
*/
export const generateConversationSummary = async (
    conversationId: string,
    userId: number | string,
    customPrompt: string | undefined,
    req?: GenerateConversationSummaryRequest,
    res?: Response
): Promise<void> => {
    try {
        if (!userId) {
            if (res) {
                res.status(400).json({
                    success: false,
                    error: 'conversationId and userId are required'
                });
            }
            return;
        }

        if (!isValidUUID(conversationId)) {
            if (res) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid conversationId format. Must be a valid UUID.'
                });
            }
            return;
        }

        // First check if this conversation exists in your view
        const { data: conversationInfo, error: conversationError }: { data: ConversationInfo | null, error: any } = await supabase
            .from('conversation_summaries')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (conversationError || !conversationInfo) {
            if (res) {
                res.status(404).json({
                    success: false,
                    error: 'Conversation not found'
                });
            }
            return;
        }

        // Get the full conversation history
        const history = await getConversationHistory(parseInt(userId as string), 100, 0);

        if (history.length === 0) {
            if (res) {
                res.status(404).json({
                    success: false,
                    error: 'No messages found in conversation'
                });
            }
            return;
        }

        // Create conversation text for summarization
        const conversationText = history
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');

        // Enhanced summary prompt
        const summaryPrompt: string = customPrompt || `Please analyze the following conversation and provide a comprehensive summary that includes:

1. **Main Topics Discussed**: Key subjects and themes covered
2. **Key Questions Asked**: Important questions raised by the user
3. **Solutions Provided**: Main solutions, advice, or answers given
4. **Technical Details**: Any code, technical concepts, or specific implementations mentioned
5. **Action Items**: Any next steps or recommendations provided
6. **Conversation Outcome**: Overall result or conclusion reached

Please keep the summary concise but informative, focusing on the most important aspects of the conversation.

CONVERSATION:
${conversationText}

SUMMARY:`;

        console.log(`Generating summary for conversation ${conversationId} with ${history.length} messages`);

        // Generate summary using Gemini
        const summary: string = await geminiService.generateCompletion(summaryPrompt, {
            temperature: 0.3, 
            maxTokens: 1024
        });

        // Generate a title for the conversation
        const titlePrompt: string = `Based on this conversation summary, generate a brief, descriptive title (max 8 words) that captures the main topic:

${summary}

Title:`;

        const title: string = await geminiService.generateCompletion(titlePrompt, {
            temperature: 0.3,
            maxTokens: 50
        });

        const cleanTitle: string = title.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present

        // Store the AI-generated summary in the ai_conversation_summaries table
        const { data, error }: { data: AiConversationSummary[] | null, error: any } = await supabase
            .from('ai_conversation_summaries')
            .upsert({
                conversation_id: conversationId,
                user_id: parseInt(userId as string),
                title: cleanTitle,
                summary: summary,
                summary_type: 'manual',
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('Error storing conversation summary:', error);
            throw new Error(`Failed to store summary: ${error.message}`);
        }

        if (res) {
            res.json({
                success: true,
                conversationId,
                title: cleanTitle,
                summary,
                messageCount: conversationInfo.message_count,
                conversationInfo,
                summaryData: data?.[0],
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('Generate summary error:', error);
        if (res) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate conversation summary'
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
        // Get existing summary info
        const { data: existingSummary } = await supabase
            .from('ai_conversation_summaries')
            .select('id, updated_at')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        // Update summary if:
        // 1. No existing summary and conversation has 8+ messages
        // 2. Existing summary but conversation has grown significantly (every 10 messages after initial summary)
        if (!existingSummary) {
            return messageCount >= 8;
        } else {
            return messageCount % 10 === 0 && messageCount >= 15;
        }
    } catch (error) {
        console.log('Error checking summary update status:', error);
        return false;
    }
};
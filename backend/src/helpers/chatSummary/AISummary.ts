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
): Promise<{ success: boolean; title?: string; summary?: string } | void> => {
  try {
    console.log(`Starting summary generation for conversation: ${conversationId}, user: ${userId}`);

    if (!conversationId || !userId) {
      const errorMsg = 'conversationId and userId are required';
      console.error(errorMsg);
      if (res) res.status(400).json({ success: false, error: errorMsg });
      return { success: false };
    }

    if (!isValidUUID(conversationId)) {
      const errorMsg = 'Invalid conversationId format. Must be a valid UUID.';
      console.error(errorMsg);
      if (res) res.status(400).json({ success: false, error: errorMsg });
      return { success: false };
    }

    if (!process.env.GEMINI_API_KEY) {
      const errorMsg = 'Gemini API key is not configured';
      console.error(errorMsg);
      if (res) res.status(500).json({ success: false, error: errorMsg });
      return { success: false };
    }

    console.log(`Fetching messages for conversation ${conversationId}...`);

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', parseInt(userId as string))
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      const errorMsg = 'No messages found in conversation';
      console.error(errorMsg);
      if (res) res.status(404).json({ success: false, error: errorMsg });
      return { success: false };
    }

    const conversationText = messages
      .map(msg => `${msg.role?.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    const summaryPrompt = customPrompt || `Please analyze the following conversation and provide a comprehensive summary:
${conversationText}

SUMMARY:`;

    const summary = await geminiService.generateCompletion(summaryPrompt, {
      temperature: 0.3,
      maxTokens: 1024
    });

    if (!summary || summary.trim().length === 0) {
      throw new Error('AI service returned empty summary');
    }

    const titlePrompt = `Based on this conversation summary, generate a brief, descriptive title (max 8 words):

${summary}

Title:`;

    const titleRaw = await geminiService.generateCompletion(titlePrompt, {
      temperature: 0.3,
      maxTokens: 50
    });

    const title = titleRaw.trim().replace(/^["']|["']$/g, '');
    if (!title) throw new Error('AI service returned empty title');

    const { error } = await supabase.from('ai_conversation_summaries').upsert({
      conversation_id: conversationId,
      user_id: parseInt(userId as string),
      title,
      summary,
      summary_type: 'manual',
      message_count: messages.length,
      updated_at: new Date().toISOString()
    });

    if (error) throw new Error(`Failed to store summary: ${error.message}`);

    console.log('✅ Summary generated and stored successfully');

    if (res) {
      res.json({
        success: true,
        conversationId,
        title,
        summary,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, title, summary };
  } catch (error: any) {
    console.error('❌ Summary generation error:', error);
    if (res) {
      res.status(500).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    return { success: false };
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
}